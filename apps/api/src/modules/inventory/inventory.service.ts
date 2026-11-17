import type { SourceInventory, TargetInventory } from '@crossvisor/contracts';
import { Injectable } from '@nestjs/common';
import { ProviderClientFactory } from '../../infra/provider-client.factory.js';

/**
 * Lee el inventario en vivo de un proveedor.
 * TODO: cachear en BD (tabla inventory_snapshots) para pools grandes.
 */
@Injectable()
export class InventoryService {
  constructor(private readonly clients: ProviderClientFactory) {}

  async get(providerId: string): Promise<SourceInventory | TargetInventory> {
    const row = await this.clients.load(providerId);
    return row.kind === 'proxmox'
      ? this.clients.withProxmox(row, (pve) => pve.getInventory())
      : this.clients.withXcpng(row, (xcp) => xcp.getInventory());
  }
}
