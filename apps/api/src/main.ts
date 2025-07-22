import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import * as dotenv from 'dotenv';
import { getConfig } from '@my_own_note/core';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = await getConfig();
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = config.service.api.port;
  await app.listen(port);
  Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
