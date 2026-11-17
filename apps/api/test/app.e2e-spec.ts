import { INestApplication, StandardSchemaValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { HealthController } from '../src/modules/health/health.controller.js';
import { ProvidersController } from '../src/modules/providers/providers.controller.js';
import { ProvidersService } from '../src/modules/providers/providers.service.js';

/** e2e sin BD: comprueba rutas y validación Zod de los contratos compartidos. */
describe('API (e2e)', () => {
  let app: INestApplication<App>;
  const providersService = { create: vi.fn(async (dto: unknown) => dto), findAll: vi.fn(async () => []) };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController, ProvidersController],
      providers: [{ provide: ProvidersService, useValue: providersService }],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new StandardSchemaValidationPipe());
    await app.init();
  });

  afterEach(() => app.close());

  it('GET /health', () => request(app.getHttpServer()).get('/health').expect(200, { status: 'ok' }));

  it('POST /providers rechaza un token de Proxmox mal formado', () =>
    request(app.getHttpServer())
      .post('/providers')
      .send({ kind: 'proxmox', name: 'pve', url: 'https://pve:8006', tokenId: 'sin-formato', tokenSecret: 'x' })
      .expect(400));

  it('POST /providers acepta un XCP-ng válido', async () => {
    await request(app.getHttpServer())
      .post('/providers')
      .send({ kind: 'xcpng', name: 'pool', url: 'https://xcp.lan', username: 'root', password: 's3cret' })
      .expect(201);
    expect(providersService.create).toHaveBeenCalledWith(expect.objectContaining({ insecureTls: false }));
  });
});
