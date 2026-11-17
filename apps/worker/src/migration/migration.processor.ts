import { MIGRATION_QUEUE, MigrationJobName, type RunMigrationJob } from '@crossvisor/contracts';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { env } from '../config/env.js';
import { MigrationRunnerService } from './migration-runner.service.js';

/** Consume la cola "migrations" (en PostgreSQL) que llena apps/api. */
@Processor(MIGRATION_QUEUE, { concurrency: env.WORKER_CONCURRENCY })
export class MigrationProcessor extends WorkerHost {
  private readonly logger = new Logger(MigrationProcessor.name);

  constructor(private readonly runner: MigrationRunnerService) {
    super();
  }

  async process(job: Job<RunMigrationJob>): Promise<void> {
    if (job.name !== MigrationJobName.Run) return;
    this.logger.log(`Job ${job.id}: migración ${job.data.migrationId}`);
    await this.runner.run(job.data.migrationId);
  }
}
