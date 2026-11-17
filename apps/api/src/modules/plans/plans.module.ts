import { Module } from '@nestjs/common';
import { MigrationsModule } from '../migrations/migrations.module.js';
import { PlansController } from './plans.controller.js';
import { PlansService } from './plans.service.js';

@Module({
  imports: [MigrationsModule],
  controllers: [PlansController],
  providers: [PlansService],
  exports: [PlansService],
})
export class PlansModule {}
