import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import helmet from 'helmet';
import compression from 'compression';
import { json } from 'express';

import { AppModule } from './app.module';
import { winstonLoggerOptions } from './common/logger/winston.logger';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(winstonLoggerOptions),
  });

  const config = app.get(ConfigService);
  const apiPrefix = config.get<string>('apiPrefix') as string;
  const port = config.get<number>('port') as number;
  const corsOrigin = config.get<string[]>('security.corsOrigin') as string[];

  // ── Sécurité HTTP ────────────────────────────────────────────────────────
  app.use(helmet());
  app.use(compression());
  // Limite par défaut d'Express (100kb) trop basse pour un logo d'entreprise encodé en base64.
  app.use(json({ limit: '5mb' }));
  app.enableCors({
    origin: corsOrigin.length > 0 ? corsOrigin : true,
    credentials: true,
  });

  // Le préfixe (ex: "api/v1") porte déjà la version — pas de VersioningType Nest en plus.
  app.setGlobalPrefix(apiPrefix);

  // ── Validation globale des DTO ──────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Intercepteurs globaux (logs + enveloppe de réponse) ─────────────────
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  // ── Swagger ───────────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SNADARPE ERP API')
    .setDescription("API REST de SNADARPE ERP — gestion logistique multi-entreprises, multi-entrepôts, multi-devises.")
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`🚀 SNADARPE ERP API démarrée sur http://localhost:${port}/${apiPrefix}`);
  // eslint-disable-next-line no-console
  console.log(`📚 Swagger disponible sur http://localhost:${port}/docs`);
}

bootstrap();
