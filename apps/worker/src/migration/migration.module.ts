import { Module } from '@nestjs/common';
import { MigrationRunnerService } from './migration-runner.service.js';
import { MigrationProcessor } from './migration.processor.js';

@Module({
  providers: [MigrationProcessor, MigrationRunnerService],
})
export class MigrationModule {}
