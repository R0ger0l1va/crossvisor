import type { CreateProviderDto, Provider } from '@crossvisor/contracts';
import { encryptSecret, providers, type Database, type ProviderRow } from '@crossvisor/db';
import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { desc, eq } from 'drizzle-orm';
import { ProviderClientFactory } from '../../infra/provider-client.factory.js';

/** Quita los secretos y adapta fechas al contrato público. */
export function toProvider(row: ProviderRow): Provider {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    url: row.url,
    insecureTls: row.insecureTls,
    status: row.status,
    statusMessage: row.statusMessage,
    lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class ProvidersService {
  constructor(
    @InjectDrizzle() private readonly db: Database,
    private readonly clients: ProviderClientFactory,
  ) {}

  async findAll(): Promise<Provider[]> {
    const rows = await this.db.select().from(providers).orderBy(desc(providers.createdAt));
    return rows.map(toProvider);
  }

  async findOne(id: string): Promise<Provider> {
    return toProvider(await this.clients.load(id));
  }

  async create(dto: CreateProviderDto): Promise<Provider> {
    const [username, secret] =
      dto.kind === 'xcpng' ? [dto.username, dto.password] : [dto.tokenId, dto.tokenSecret];
    const [row] = await this.db
      .insert(providers)
      .values({
        name: dto.name,
        kind: dto.kind,
        url: dto.url,
        insecureTls: dto.insecureTls,
        username,
        secretEncrypted: encryptSecret(secret),
      })
      .returning();
    return this.test(row!.id);
  }

  async remove(id: string): Promise<void> {
    await this.db.delete(providers).where(eq(providers.id, id));
  }

  /** Prueba la conexión y guarda el resultado en el proveedor. */
  async test(id: string): Promise<Provider> {
    const row = await this.clients.load(id);
    let status: ProviderRow['status'] = 'ok';
    let statusMessage: string | null = null;
    try {
      if (row.kind === 'xcpng') await this.clients.withXcpng(row, async () => undefined);
      else await this.clients.proxmox(row).api.version.$get();
    } catch (err) {
      status = 'error';
      statusMessage = err instanceof Error ? err.message : String(err);
    }
    const [updated] = await this.db
      .update(providers)
      .set({ status, statusMessage, lastCheckedAt: new Date() })
      .where(eq(providers.id, id))
      .returning();
    return toProvider(updated!);
  }
}

