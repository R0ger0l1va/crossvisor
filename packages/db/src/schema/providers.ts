import { boolean, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const providerKind = pgEnum('provider_kind', ['xcpng', 'proxmox']);
export const providerStatus = pgEnum('provider_status', ['unknown', 'ok', 'error']);

/** Conexiones a hipervisores: XCP-ng (origen) y Proxmox (destino). */
export const providers = pgTable('providers', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  kind: providerKind().notNull(),
  url: text().notNull(),
  insecureTls: boolean('insecure_tls').notNull().default(false),
  /** Usuario XAPI (xcpng) o tokenId (proxmox). */
  username: text().notNull(),
  /** Contraseña o tokenSecret, cifrado con AES-256-GCM (ver secrets.ts). */
  secretEncrypted: text('secret_encrypted').notNull(),
  status: providerStatus().notNull().default('unknown'),
  statusMessage: text('status_message'),
  lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ProviderRow = typeof providers.$inferSelect;
export type NewProviderRow = typeof providers.$inferInsert;
