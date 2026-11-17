import { MIGRATION_STEPS } from '@crossvisor/contracts';
import {
  bigint,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { plans } from './plans.js';

export const migrationStatus = pgEnum('migration_status', [
  'pending',
  'running',
  'succeeded',
  'failed',
  'canceled',
]);
export const migrationStep = pgEnum('migration_step', MIGRATION_STEPS);
export const logLevel = pgEnum('log_level', ['debug', 'info', 'warn', 'error']);

/** Una ejecución de migración = una VM de un plan. */
export const migrations = pgTable(
  'migrations',
  {
    id: uuid().primaryKey().defaultRandom(),
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id, { onDelete: 'cascade' }),
    sourceVmUuid: text('source_vm_uuid').notNull(),
    vmName: text('vm_name').notNull(),
    status: migrationStatus().notNull().default('pending'),
    currentStep: migrationStep('current_step'),
    progress: integer().notNull().default(0),
    targetVmid: integer('target_vmid'),
    /** Datos que un paso deja para los siguientes (refs de snapshot, volúmenes creados...). */
    state: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    error: text(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('migrations_plan_idx').on(t.planId)],
);

/** Bitácora de cada migración, se muestra en vivo en la UI. */
export const migrationLogs = pgTable(
  'migration_logs',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    migrationId: uuid('migration_id')
      .notNull()
      .references(() => migrations.id, { onDelete: 'cascade' }),
    level: logLevel().notNull().default('info'),
    step: migrationStep(),
    message: text().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('migration_logs_migration_idx').on(t.migrationId, t.id)],
);

export type MigrationRow = typeof migrations.$inferSelect;
export type NewMigrationRow = typeof migrations.$inferInsert;
export type MigrationLogRow = typeof migrationLogs.$inferSelect;
