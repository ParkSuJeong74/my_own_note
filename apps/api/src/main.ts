import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import * as dotenv from 'dotenv';
import { getConfig } from '@my_own_note/core';
import * as redoc from 'redoc-express';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = await getConfig();
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Swagger/OpenAPI 설정
  const swaggerConfig = new DocumentBuilder()
    .setTitle('My Own Note API')
    .setDescription('개인 노트 애플리케이션 API 문서')
    .setVersion('1.0')
    .addTag('notes', '노트 관련 API')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  
  // Swagger UI 설정 (기본)
  SwaggerModule.setup('api/docs', app, document);

  // ReDoc 설정
  app.use('/api/redoc', redoc({
    title: 'My Own Note API Documentation',
    specUrl: '/api/docs-json',
    redocOptions: {
      theme: {
        colors: {
          primary: {
            main: '#2563eb'
          }
        },
        typography: {
          fontSize: '14px',
          lineHeight: '1.5',
          code: {
            fontSize: '13px'
          }
        }
      },
      hideDownloadButton: false,
      hideHostname: false,
      expandResponses: '200,201',
      requiredPropsFirst: true,
      sortPropsAlphabetically: true,
      showExtensions: true,
      noAutoAuth: false
    }
  }));

  // OpenAPI JSON 문서 제공
  app.use('/api/docs-json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(document);
  });

  const port = config.service.api.port;
  await app.listen(port);
  
  Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);
  Logger.log(`📚 Swagger UI: http://localhost:${port}/${globalPrefix}/docs`);
  Logger.log(`📖 ReDoc: http://localhost:${port}/${globalPrefix}/redoc`);
}

bootstrap();
