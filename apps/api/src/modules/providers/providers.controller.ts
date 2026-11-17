import { createProviderSchema, type CreateProviderDto } from '@crossvisor/contracts';
import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ProvidersService } from './providers.service.js';

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providers: ProvidersService) {}

  @Get()
  findAll() {
    return this.providers.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.providers.findOne(id);
  }

  @Post()
  create(@Body({ schema: createProviderSchema }) dto: CreateProviderDto) {
    return this.providers.create(dto);
  }

  @Post(':id/test')
  test(@Param('id', ParseUUIDPipe) id: string) {
    return this.providers.test(id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.providers.remove(id);
  }
}
