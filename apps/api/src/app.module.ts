import { Module } from '@nestjs/common';
import { InfraModule } from './infra/infra.module.js';
import { HealthController } from './modules/health/health.controller.js';
import { InventoryModule } from './modules/inventory/inventory.module.js';
import { MigrationsModule } from './modules/migrations/migrations.module.js';
import { PlansModule } from './modules/plans/plans.module.js';
import { ProvidersModule } from './modules/providers/providers.module.js';

@Module({
  imports: [InfraModule, ProvidersModule, InventoryModule, PlansModule, MigrationsModule],
  controllers: [HealthController],
})
export class AppModule {}
