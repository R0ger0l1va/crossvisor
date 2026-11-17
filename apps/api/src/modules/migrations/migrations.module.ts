import { Module } from '@nestjs/common';
import { MigrationsController } from './migrations.controller.js';
import { MigrationsService } from './migrations.service.js';

@Module({
  controllers: [MigrationsController],
  providers: [MigrationsService],
  exports: [MigrationsService],
})
export class MigrationsModule {}
