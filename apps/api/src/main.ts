import { getConfig } from '@my_own_note/core';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as dotenv from 'dotenv';
import { AppModule } from './app/app.module';
import { setupDocumentation } from './redoc.config';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = await getConfig();
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  if (process.env.NODE_ENV === 'local') {
    setupDocumentation(app);
  }

  const port = config.service.api.port;
  await app.listen(port);

  Logger.log(`Application is running on: http://localhost:${port}/${globalPrefix}`);
  Logger.log(`ReDoc: http://localhost:${port}/${globalPrefix}/redoc`);
}

bootstrap();
