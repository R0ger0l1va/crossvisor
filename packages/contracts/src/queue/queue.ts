/**
 * Contrato de la cola entre apps/api (productor) y apps/worker (consumidor).
 * La cola vive en PostgreSQL (BullMQ con backend Postgres), no hace falta Redis.
 */
export const MIGRATION_QUEUE = 'migrations';

export const MigrationJobName = {
  /** Ejecuta (o reanuda) el pipeline completo de una VM. */
  Run: 'run',
  /** Cancela una migración en curso. */
  Cancel: 'cancel',
} as const;

export interface RunMigrationJob {
  migrationId: string;
}
