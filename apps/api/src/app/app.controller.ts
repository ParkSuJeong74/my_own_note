import {
  AppControllerDocs,
  GetConfigDocs,
  GetDataDocs,
  getPublicConfig,
  ResGetConfigDto,
} from '@my_own_note/core';
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@AppControllerDocs()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @GetDataDocs()
  getData() {
    return this.appService.getData();
  }

  @Get('config')
  @GetConfigDocs()
  async getConfig() {
    const config = await getPublicConfig();
    return new ResGetConfigDto(config);
  }
}
