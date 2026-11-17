import {
  MIGRATION_QUEUE,
  MigrationJobName,
  type Migration,
  type MigrationLog,
  type RunMigrationJob,
} from '@crossvisor/contracts';
import {
  migrationLogs,
  migrations,
  plans,
  type Database,
  type MigrationLogRow,
  type MigrationRow,
} from '@crossvisor/db';
import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import type { Queue } from 'bullmq';
import { and, asc, desc, eq, gt, inArray } from 'drizzle-orm';
import { ProviderClientFactory } from '../../infra/provider-client.factory.js';

const iso = (d: Date | null) => d?.toISOString() ?? null;

export function toMigration(r: MigrationRow): Migration {
  return {
    id: r.id,
    planId: r.planId,
    sourceVmUuid: r.sourceVmUuid,
    vmName: r.vmName,
    status: r.status,
    currentStep: r.currentStep,
    progress: r.progress,
    targetVmid: r.targetVmid,
    error: r.error,
    startedAt: iso(r.startedAt),
    finishedAt: iso(r.finishedAt),
    createdAt: r.createdAt.toISOString(),
  };
}

export function toMigrationLog(r: MigrationLogRow): MigrationLog {
  return { ...r, createdAt: r.createdAt.toISOString() };
}

@Injectable()
export class MigrationsService {
  constructor(
    @InjectDrizzle() private readonly db: Database,
    @InjectQueue(MIGRATION_QUEUE) private readonly queue: Queue<RunMigrationJob>,
    private readonly clients: ProviderClientFactory,
  ) {}

  async findAll(planId?: string): Promise<Migration[]> {
    const rows = await this.db
      .select()
      .from(migrations)
      .where(planId ? eq(migrations.planId, planId) : undefined)
      .orderBy(desc(migrations.createdAt));
    return rows.map(toMigration);
  }

  async findOne(id: string): Promise<Migration> {
    const [row] = await this.db.select().from(migrations).where(eq(migrations.id, id));
    if (!row) throw new NotFoundException(`Migración ${id} no existe`);
    return toMigration(row);
  }

  async logs(id: string, afterId = 0): Promise<MigrationLog[]> {
    const rows = await this.db
      .select()
      .from(migrationLogs)
      .where(and(eq(migrationLogs.migrationId, id), gt(migrationLogs.id, afterId)))
      .orderBy(asc(migrationLogs.id))
      .limit(500);
    return rows.map(toMigrationLog);
  }

  /** Crea una migración por VM del plan y encola los trabajos. */
  async startPlan(planId: string): Promise<Migration[]> {
    const [plan] = await this.db.select().from(plans).where(eq(plans.id, planId));
    if (!plan) throw new NotFoundException(`Plan ${planId} no existe`);

    const active = await this.db
      .select({ id: migrations.id })
      .from(migrations)
      .where(and(eq(migrations.planId, planId), inArray(migrations.status, ['pending', 'running'])));
    if (active.length) throw new BadRequestException('El plan ya tiene migraciones en curso');

    // Nombres de las VMs (para mostrarlos en la UI sin consultar XCP-ng cada vez).
    const source = await this.clients.load(plan.sourceProviderId);
    const inventory = await this.clients.withXcpng(source, (xcp) => xcp.getInventory());
    const names = new Map(inventory.vms.map((vm) => [vm.uuid, vm.name]));

    const rows = await this.db
      .insert(migrations)
      .values(
        plan.vms.map((vm) => ({
          planId,
          sourceVmUuid: vm.sourceVmUuid,
          vmName: names.get(vm.sourceVmUuid) ?? vm.sourceVmUuid,
          targetVmid: vm.targetVmid,
        })),
      )
      .returning();

    await this.queue.addBulk(
      rows.map((m) => ({
        name: MigrationJobName.Run,
        data: { migrationId: m.id },
        opts: { jobId: m.id, attempts: 1, removeOnComplete: 100, removeOnFail: 500 },
      })),
    );
    return rows.map(toMigration);
  }

  /** Reintenta una migración fallida: el worker reanuda desde el paso que falló. */
  async retry(id: string): Promise<Migration> {
    const current = await this.findOne(id);
    if (current.status !== 'failed' && current.status !== 'canceled') {
      throw new BadRequestException('Solo se pueden reintentar migraciones fallidas o canceladas');
    }
    const [row] = await this.db
      .update(migrations)
      .set({ status: 'pending', error: null, finishedAt: null })
      .where(eq(migrations.id, id))
      .returning();
    await this.queue.add(MigrationJobName.Run, { migrationId: id }, { jobId: `${id}-retry-${Date.now()}` });
    return toMigration(row!);
  }

  /** Marca la migración como cancelada; el worker lo comprueba entre pasos. */
  async cancel(id: string): Promise<Migration> {
    const [row] = await this.db
      .update(migrations)
      .set({ status: 'canceled', finishedAt: new Date() })
      .where(and(eq(migrations.id, id), inArray(migrations.status, ['pending', 'running'])))
      .returning();
    return row ? toMigration(row) : this.findOne(id);
  }
}
