import { MIGRATION_STEPS } from '@crossvisor/contracts';
import { decryptSecret, migrations, type Database } from '@crossvisor/db';
import { ProxmoxClient } from '@crossvisor/proxmox';
import { XcpngClient } from '@crossvisor/xcpng';
import { Injectable, Logger } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { eq } from 'drizzle-orm';
import { env } from '../config/env.js';
import { MigrationContext, type MigrationState } from './migration-context.js';
import { PIPELINE } from './steps/index.js';

/**
 * Orquesta el pipeline de una migración:
 *  - ejecuta los pasos en orden, guardando currentStep/progress en la BD
 *  - si se reintenta, REANUDA desde el paso que falló
 *  - comprueba la cancelación cada pocos segundos
 */
@Injectable()
export class MigrationRunnerService {
  private readonly logger = new Logger(MigrationRunnerService.name);

  constructor(@InjectDrizzle() private readonly db: Database) {}

  async run(migrationId: string): Promise<void> {
    const migration = await this.db.query.migrations.findFirst({
      where: { id: migrationId },
      with: { plan: { with: { sourceProvider: true, targetProvider: true } } },
    });
    if (!migration) throw new Error(`Migración ${migrationId} no existe`);
    if (migration.status === 'canceled' || migration.status === 'succeeded') return;

    const { plan } = migration;
    const planVm = plan.vms.find((v) => v.sourceVmUuid === migration.sourceVmUuid);
    if (!planVm) throw new Error('La VM ya no está en el plan');

    const xcpng = new XcpngClient({
      url: plan.sourceProvider.url,
      username: plan.sourceProvider.username,
      password: decryptSecret(plan.sourceProvider.secretEncrypted),
      insecureTls: plan.sourceProvider.insecureTls,
    });
    const proxmox = new ProxmoxClient({
      url: plan.targetProvider.url,
      tokenId: plan.targetProvider.username,
      tokenSecret: decryptSecret(plan.targetProvider.secretEncrypted),
      insecureTls: plan.targetProvider.insecureTls,
    });

    const abort = new AbortController();
    const ctx = new MigrationContext(
      this.db,
      migration,
      plan,
      planVm,
      xcpng,
      proxmox,
      env.WORKER_SCRATCH_DIR,
      abort.signal,
      (migration.state ?? {}) as MigrationState,
    );

    // Reanudar desde el paso donde se quedó (o desde el principio).
    const resumeAt = migration.currentStep ? MIGRATION_STEPS.indexOf(migration.currentStep) : 0;
    const cancelWatcher = setInterval(() => void this.checkCanceled(migrationId, abort), 5_000);

    await this.update(migrationId, { status: 'running', error: null, startedAt: migration.startedAt ?? new Date() });
    try {
      await xcpng.connect();
      for (const step of PIPELINE.slice(resumeAt)) {
        await this.checkCanceled(migrationId, abort);
        if (abort.signal.aborted) {
          await ctx.log('Migración cancelada', 'warn');
          return;
        }
        ctx.currentStep = step.name;
        await this.update(migrationId, { currentStep: step.name, progress: 0 });
        await ctx.log(`▶ ${step.name}`);
        await step.run(ctx);
        await ctx.progress(100);
      }
      await this.update(migrationId, { status: 'succeeded', finishedAt: new Date() });
      await ctx.log('✔ Migración completada');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(message, err instanceof Error ? err.stack : undefined);
      if (!abort.signal.aborted) {
        await ctx.log(message, 'error');
        await this.update(migrationId, { status: 'failed', error: message, finishedAt: new Date() });
      }
    } finally {
      clearInterval(cancelWatcher);
      await xcpng.disconnect().catch(() => undefined);
    }
  }

  private async checkCanceled(id: string, abort: AbortController) {
    const [row] = await this.db
      .select({ status: migrations.status })
      .from(migrations)
      .where(eq(migrations.id, id));
    if (row?.status === 'canceled') abort.abort(new Error('Cancelada por el usuario'));
  }

  private async update(id: string, values: Partial<typeof migrations.$inferInsert>) {
    await this.db.update(migrations).set(values).where(eq(migrations.id, id));
  }
}

