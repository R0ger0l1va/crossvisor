import { MIGRATION_QUEUE } from '@crossvisor/contracts';
import { relations } from '@crossvisor/db';
import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { DrizzleModule } from '@nestjs/drizzle';
import { createPostgresBackend } from 'bullmq';
import { drizzle } from 'drizzle-orm/node-postgres';
import { env } from '../config/env.js';
import { ProviderClientFactory } from './provider-client.factory.js';

/**
 * Infraestructura compartida por todos los módulos:
 *  - PostgreSQL vía Drizzle (@InjectDrizzle())
 *  - Cola "migrations" de BullMQ, también sobre PostgreSQL (schema "bullmq")
 *  - Fábrica de clientes XCP-ng / Proxmox
 */
@Global()
@Module({
  imports: [
    DrizzleModule.forRoot({ drizzle, connection: env.DATABASE_URL, relations }),
    BullModule.forRoot({
      backendFactory: createPostgresBackend,
      connection: { connectionString: env.DATABASE_URL, migrate: true },
    }),
    BullModule.registerQueue({ name: MIGRATION_QUEUE }),
  ],
  providers: [ProviderClientFactory],
  exports: [BullModule, ProviderClientFactory],
})
export class InfraModule {}
