import type { MigrationStep } from '@crossvisor/contracts';
import type { MigrationContext } from '../migration-context.js';

/**
 * Un paso del pipeline. Debe ser IDEMPOTENTE: si el worker se cae a mitad,
 * al reintentar se vuelve a ejecutar el paso que falló. Usa ctx.state para
 * recordar lo que ya se hizo (ej. discos ya copiados).
 */
export interface Step {
  readonly name: MigrationStep;
  run(ctx: MigrationContext): Promise<void>;
}
