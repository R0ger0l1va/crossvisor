import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SECRETS_KEY: z.string().min(1),
  API_PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
});

export type Env = z.infer<typeof envSchema>;

/** Variables de entorno validadas: falla al arrancar si falta algo. */
export const env: Env = envSchema.parse(process.env);
