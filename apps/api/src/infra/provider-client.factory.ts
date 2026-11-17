import { decryptSecret, providers, type Database, type ProviderRow } from '@crossvisor/db';
import { ProxmoxClient } from '@crossvisor/proxmox';
import { XcpngClient } from '@crossvisor/xcpng';
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { eq } from 'drizzle-orm';

/** Construye el cliente correcto (XCP-ng o Proxmox) a partir de un proveedor guardado. */
@Injectable()
export class ProviderClientFactory {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  async load(id: string): Promise<ProviderRow> {
    const [row] = await this.db.select().from(providers).where(eq(providers.id, id));
    if (!row) throw new NotFoundException(`Proveedor ${id} no existe`);
    return row;
  }

  xcpng(row: ProviderRow): XcpngClient {
    if (row.kind !== 'xcpng') throw new BadRequestException('El proveedor no es XCP-ng');
    return new XcpngClient(
      {
        url: row.url,
        username: row.username,
        password: decryptSecret(row.secretEncrypted),
        insecureTls: row.insecureTls,
      },
      { readOnly: true }, // la API solo lee; las acciones las hace el worker
    );
  }

  proxmox(row: ProviderRow): ProxmoxClient {
    if (row.kind !== 'proxmox') throw new BadRequestException('El proveedor no es Proxmox');
    return new ProxmoxClient({
      url: row.url,
      tokenId: row.username,
      tokenSecret: decryptSecret(row.secretEncrypted),
      insecureTls: row.insecureTls,
    });
  }

  /**
   * Abre sesión XAPI, ejecuta `fn` y la cierra siempre.
   * Si el hipervisor no responde devuelve 502 con un mensaje legible.
   */
  async withXcpng<T>(row: ProviderRow, fn: (client: XcpngClient) => Promise<T>): Promise<T> {
    const client = this.xcpng(row);
    try {
      await client.connect();
    } catch (err) {
      throw new BadGatewayException(`No se pudo conectar a XCP-ng "${row.name}": ${(err as Error).message}`);
    }
    try {
      return await fn(client);
    } finally {
      await client.disconnect().catch(() => undefined);
    }
  }

  /** Igual que withXcpng pero para Proxmox (sin sesión que abrir/cerrar). */
  async withProxmox<T>(row: ProviderRow, fn: (client: ProxmoxClient) => Promise<T>): Promise<T> {
    try {
      return await fn(this.proxmox(row));
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadGatewayException(`Error hablando con Proxmox "${row.name}": ${(err as Error).message}`);
    }
  }
}
