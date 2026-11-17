import { createPlanSchema, type CreatePlanDto } from '@crossvisor/contracts';
import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { MigrationsService } from '../migrations/migrations.service.js';
import { PlansService } from './plans.service.js';

@Controller('plans')
export class PlansController {
  constructor(
    private readonly plans: PlansService,
    private readonly migrations: MigrationsService,
  ) {}

  @Get()
  findAll() {
    return this.plans.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.plans.findOne(id);
  }

  @Post()
  create(@Body({ schema: createPlanSchema }) dto: CreatePlanDto) {
    return this.plans.create(dto);
  }

  /** Lanza el plan: crea una migración por VM y las encola para el worker. */
  @Post(':id/start')
  start(@Param('id', ParseUUIDPipe) id: string) {
    return this.migrations.startPlan(id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.plans.remove(id);
  }
}
