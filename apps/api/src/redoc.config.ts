import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Request, Response } from 'express';
import redoc from 'redoc-express';

export function setupDocumentation(app: INestApplication) {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('My Own Note API')
    .setDescription('MANO API 문서')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  app.use(
    '/api/redoc',
    redoc({
      title: 'My Own Note API Documentation',
      specUrl: '/api/docs-json',
    })
  );

  app.use('/api/docs-json', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(document);
  });
}
