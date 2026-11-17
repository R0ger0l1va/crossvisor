import './config/load-env.js'; // ← debe ser el primer import
import { StandardSchemaValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { env } from './config/env.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: env.WEB_ORIGIN });
  // Valida los @Body({ schema }) con los esquemas Zod de @crossvisor/contracts.
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  app.enableShutdownHooks();
  await app.listen(env.API_PORT);
}
await bootstrap();
