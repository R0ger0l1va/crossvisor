import type { CreatePlanDto, Plan } from '@crossvisor/contracts';
import { plans, type Database, type PlanRow } from '@crossvisor/db';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { desc, eq } from 'drizzle-orm';
import { ProviderClientFactory } from '../../infra/provider-client.factory.js';

export function toPlan(row: PlanRow): Plan {
  return {
    id: row.id,
    name: row.name,
    sourceProviderId: row.sourceProviderId,
    targetProviderId: row.targetProviderId,
    targetNode: row.targetNode,
    mode: row.mode,
    networkMap: row.networkMap,
    storageMap: row.storageMap,
    vms: row.vms,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class PlansService {
  constructor(
    @InjectDrizzle() private readonly db: Database,
    private readonly clients: ProviderClientFactory,
  ) {}

  async findAll(): Promise<Plan[]> {
    const rows = await this.db.select().from(plans).orderBy(desc(plans.createdAt));
    return rows.map(toPlan);
  }

  async findRow(id: string): Promise<PlanRow> {
    const [row] = await this.db.select().from(plans).where(eq(plans.id, id));
    if (!row) throw new NotFoundException(`Plan ${id} no existe`);
    return row;
  }

  async findOne(id: string): Promise<Plan> {
    return toPlan(await this.findRow(id));
  }

  async create(dto: CreatePlanDto): Promise<Plan> {
    const [source, target] = await Promise.all([
      this.clients.load(dto.sourceProviderId),
      this.clients.load(dto.targetProviderId),
    ]);
    if (source.kind !== 'xcpng') throw new BadRequestException('El origen debe ser XCP-ng');
    if (target.kind !== 'proxmox') throw new BadRequestException('El destino debe ser Proxmox');

    const [row] = await this.db.insert(plans).values(dto).returning();
    return toPlan(row!);
  }

  async remove(id: string): Promise<void> {
    await this.db.delete(plans).where(eq(plans.id, id));
  }
}
