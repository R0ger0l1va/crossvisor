import type { NetworkMapping, PlanVm, StorageMapping } from '@crossvisor/contracts';
import { jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { providers } from './providers.js';

export const migrationMode = pgEnum('migration_mode', ['cold', 'warm']);

/** Plan de migración: qué VMs, de dónde a dónde y cómo mapear redes/storage. */
export const plans = pgTable('plans', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  sourceProviderId: uuid('source_provider_id')
    .notNull()
    .references(() => providers.id),
  targetProviderId: uuid('target_provider_id')
    .notNull()
    .references(() => providers.id),
  targetNode: text('target_node').notNull(),
  mode: migrationMode().notNull().default('cold'),
  networkMap: jsonb('network_map').$type<NetworkMapping[]>().notNull(),
  storageMap: jsonb('storage_map').$type<StorageMapping[]>().notNull(),
  vms: jsonb().$type<PlanVm[]>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type PlanRow = typeof plans.$inferSelect;
export type NewPlanRow = typeof plans.$inferInsert;
