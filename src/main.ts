// Ensure crypto is available as a global (required for NestJS TypeORM in some environments)
import * as crypto from 'crypto';
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
if (typeof (globalThis as any).crypto === 'undefined') {
  (globalThis as any).crypto = crypto;
}
if (typeof (global as any).crypto === 'undefined') {
  (global as any).crypto = crypto;
}
/* eslint-enable @typescript-eslint/no-unsafe-member-access */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { SocketIoAdapter } from './providers/socket-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new SocketIoAdapter(app));

  // Enable CORS
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
  ];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global prefix (exclude root path for healthcheck)
  app.setGlobalPrefix('api', { exclude: ['/'] });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global response interceptor
  const responseInterceptor = new ResponseInterceptor();
  app.useGlobalInterceptors(responseInterceptor);

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('ProFootball API')
    .setDescription('Real-time Football Match Center API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  // Get base URL from environment variables (Railway provides RAILWAY_PUBLIC_DOMAIN)
  // Or construct from PORT and hostname
  const getBaseUrl = (): string => {
    // Check for explicit BASE_URL
    if (process.env.BASE_URL) {
      return process.env.BASE_URL.replace(/\/$/, '');
    }

    // Check for Railway public domain
    if (process.env.RAILWAY_PUBLIC_DOMAIN) {
      const protocol =
        process.env.RAILWAY_ENVIRONMENT === 'production' ? 'https' : 'http';
      return `${protocol}://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
    }

    // Fallback to localhost for development
    return `http://localhost:${port}`;
  };

  const baseUrl = getBaseUrl();

  console.log(`🚀 Application is running on: ${baseUrl}`);
  console.log(`📚 Swagger documentation: ${baseUrl}/api/docs`);
}
void bootstrap();
