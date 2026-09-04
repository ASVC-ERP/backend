import { config } from 'dotenv';
config();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { Console } from 'console';

const isProd = process.env.NODE_ENV === 'production';

function assertEnv() {
  const required = ['JWT_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }
  if ((process.env.JWT_SECRET as string).length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
}

// CORS origin policy:
//   CORS_ORIGIN set   -> allow exactly those comma-separated origins
//   unset + dev       -> reflect any origin (localhost convenience)
//   unset + prod      -> disable CORS entirely. Correct when the built frontend
//                        is served from this app's ./public folder (same origin,
//                        so no cross-origin requests to allow).
function corsOrigin(): boolean | string[] {
  const raw = process.env.CORS_ORIGIN;
  if (raw) {
    return raw
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
  }
  return isProd ? false : true;
}

async function bootstrap() {
  assertEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');
  // One proxy hop in front (Render, and most PaaS). Makes req.ip the real
  // client address instead of the proxy's -- needed for accurate audit-log
  // IPs and for per-IP rate limiting to actually be per-IP.
  app.set('trust proxy', 1);
  app.use(cookieParser());
  app.enableCors({
    origin: corsOrigin(),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  const db = process.env.DB_NAME!; 
  console.log("=========================================================================")
  console.log("=== DATABASE: ", db);
  console.log("=========================================================================")

  await app.listen(Number(process.env.PORT) || 3000, '0.0.0.0');
}
bootstrap();
