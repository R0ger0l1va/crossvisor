import './config/load-env.js'; // ← debe ser el primer import
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

/**
 * El worker no expone HTTP: es un contexto de aplicación que escucha la cola.
 * Despliégalo EN un nodo Proxmox (necesita la CLI `qm` y acceso a XCP-ng).
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();
  new Logger('Worker').log('Esperando migraciones en la cola…');
}
await bootstrap();
