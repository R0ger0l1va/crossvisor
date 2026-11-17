import { defineRelations } from 'drizzle-orm';
import * as schema from './schema/index.js';

export const relations = defineRelations(schema, (r) => ({
  providers: {
    sourcePlans: r.many.plans({ alias: 'source' }),
    targetPlans: r.many.plans({ alias: 'target' }),
  },
  plans: {
    sourceProvider: r.one.providers({
      from: r.plans.sourceProviderId,
      to: r.providers.id,
      alias: 'source',
      optional: false,
    }),
    targetProvider: r.one.providers({
      from: r.plans.targetProviderId,
      to: r.providers.id,
      alias: 'target',
      optional: false,
    }),
    migrations: r.many.migrations(),
  },
  migrations: {
    plan: r.one.plans({ from: r.migrations.planId, to: r.plans.id, optional: false }),
    logs: r.many.migrationLogs(),
  },
  migrationLogs: {
    migration: r.one.migrations({
      from: r.migrationLogs.migrationId,
      to: r.migrations.id,
      optional: false,
    }),
  },
}));
