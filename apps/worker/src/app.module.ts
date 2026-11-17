import { Module } from '@nestjs/common';
import { InfraModule } from './infra/infra.module.js';
import { MigrationModule } from './migration/migration.module.js';

@Module({
  imports: [InfraModule, MigrationModule],
})
export class AppModule {}
