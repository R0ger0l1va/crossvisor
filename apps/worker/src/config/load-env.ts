/**
 * Se importa PRIMERO en main.ts: carga el .env de la raíz del monorepo
 * antes de que se evalúe cualquier otro módulo.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const rootEnv = resolve(import.meta.dirname, '../../../../.env');
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);
