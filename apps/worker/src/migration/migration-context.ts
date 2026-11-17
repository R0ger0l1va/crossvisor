import type { MigrationLogLevel, MigrationStep, PlanVm, SourceVm } from '@crossvisor/contracts';
import { migrationLogs, migrations, type Database, type MigrationRow, type PlanRow } from '@crossvisor/db';
import type { ProxmoxClient } from '@crossvisor/proxmox';
import type { XcpngClient } from '@crossvisor/xcpng';
import { Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';

/** Estado que los pasos comparten y que se persiste en migrations.state (jsonb). */
export interface MigrationState {
  sourceVm?: SourceVm;
  targetVmid?: number;
  /** vdiUuid → volumen de Proxmox ya importado. */
  importedDisks?: Record<string, string>;
  [key: string]: unknown;
}

/** Todo lo que un paso necesita: datos, clientes y utilidades de log/progreso. */
export class MigrationContext {
  private readonly logger: Logger;
  currentStep: MigrationStep | null = null;

  constructor(
    private readonly db: Database,
    public readonly migration: MigrationRow,
    public readonly plan: PlanRow,
    public readonly planVm: PlanVm,
    public readonly xcpng: XcpngClient,
    public readonly proxmox: ProxmoxClient,
    public readonly scratchDir: string,
    public readonly signal: AbortSignal,
    public state: MigrationState,
  ) {
    this.logger = new Logger(`Migration ${migration.vmName}`);
  }

  async log(message: string, level: MigrationLogLevel = 'info') {
    this.logger[level === 'warn' ? 'warn' : level === 'error' ? 'error' : 'log'](message);
    await this.db.insert(migrationLogs).values({
      migrationId: this.migration.id,
      level,
      step: this.currentStep,
      message,
    });
  }

  async progress(percent: number) {
    await this.db
      .update(migrations)
      .set({ progress: Math.max(0, Math.min(100, Math.round(percent))) })
      .where(eq(migrations.id, this.migration.id));
  }

  /** Guarda cambios del estado compartido (para poder reanudar). */
  async saveState(patch: Partial<MigrationState>) {
    this.state = { ...this.state, ...patch };
    await this.db
      .update(migrations)
      .set({ state: this.state, targetVmid: this.state.targetVmid ?? null })
      .where(eq(migrations.id, this.migration.id));
  }

  /** VM de origen (cargada en precheck). */
  get sourceVm(): SourceVm {
    if (!this.state.sourceVm) throw new Error('sourceVm no cargada: ¿se saltó el precheck?');
    return this.state.sourceVm;
  }

  get targetVmid(): number {
    if (!this.state.targetVmid) throw new Error('La VM destino aún no existe');
    return this.state.targetVmid;
  }

  isWindows(): boolean {
    return /windows/i.test(this.sourceVm.osName ?? '');
  }
}
