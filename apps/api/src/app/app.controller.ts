import { getPublicConfig } from '@my_own_note/core';
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Get('config')
  async getConfig() {
    return await getPublicConfig();
  }
}
