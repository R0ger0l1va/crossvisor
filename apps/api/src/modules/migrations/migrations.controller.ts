import type { Migration, MigrationLog } from '@crossvisor/contracts';
import { Controller, Get, Param, ParseUUIDPipe, Post, Query, Sse, type MessageEvent } from '@nestjs/common';
import { defer, interval, map, startWith, switchMap, takeWhile, type Observable } from 'rxjs';
import { MigrationsService } from './migrations.service.js';

const FINAL = new Set<Migration['status']>(['succeeded', 'failed', 'canceled']);

@Controller('migrations')
export class MigrationsController {
  constructor(private readonly migrations: MigrationsService) {}

  @Get()
  findAll(@Query('planId') planId?: string) {
    return this.migrations.findAll(planId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.migrations.findOne(id);
  }

  @Get(':id/logs')
  logs(@Param('id', ParseUUIDPipe) id: string, @Query('after') after?: string) {
    return this.migrations.logs(id, Number(after ?? 0));
  }

  @Post(':id/retry')
  retry(@Param('id', ParseUUIDPipe) id: string) {
    return this.migrations.retry(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.migrations.cancel(id);
  }

  /**
   * Progreso en vivo (Server-Sent Events). La web lo consume con EventSource.
   * Consulta la BD cada 2 s: simple y suficiente para decenas de migraciones.
   */
  @Sse(':id/events')
  events(@Param('id', ParseUUIDPipe) id: string): Observable<MessageEvent> {
    let lastLogId = 0;
    return interval(2000).pipe(
      startWith(0),
      switchMap(() =>
        defer(async () => {
          const [migration, logs] = await Promise.all([
            this.migrations.findOne(id),
            this.migrations.logs(id, lastLogId),
          ]);
          lastLogId = logs.at(-1)?.id ?? lastLogId;
          return { migration, logs } satisfies { migration: Migration; logs: MigrationLog[] };
        }),
      ),
      takeWhile(({ migration }) => !FINAL.has(migration.status), true),
      map((data) => ({ data })),
    );
  }
}
