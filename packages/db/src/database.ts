import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { relations } from './relations.js';

/** Tipo de la BD inyectada con @InjectDrizzle() en api y worker. */
export type Database = NodePgDatabase<typeof relations>;
