import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SECRETS_KEY: z.string().min(1),
  /** Carpeta temporal para los discos exportados (necesita espacio libre ≥ disco más grande). */
  WORKER_SCRATCH_DIR: z.string().default('/var/tmp/crossvisor'),
  /** Migraciones simultáneas por worker. Empieza con 1. */
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).default(1),
});

export const env = envSchema.parse(process.env);
