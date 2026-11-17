import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { InventoryService } from './inventory.service.js';

@Controller('providers/:id/inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  /** XCP-ng → { vms, networks, storages } · Proxmox → { nodes, storages, bridges } */
  @Get()
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventory.get(id);
  }
}
