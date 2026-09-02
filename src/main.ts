import { config } from 'dotenv';
config();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
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
  // In production the frontend origin(s) must be pinned — a wide-open CORS
  // policy plus credentialed cookies is a CSRF risk.
  if (isProd && !process.env.CORS_ORIGIN) {
    throw new Error('CORS_ORIGIN must be set when NODE_ENV=production');
  }
}

// Comma-separated list of allowed frontend origins, e.g.
// "https://ims.example.com,https://staging.ims.example.com". When unset (dev),
// reflect the request origin so localhost:5173 etc. just work.
function corsOrigin(): true | string[] {
  const raw = process.env.CORS_ORIGIN;
  if (!raw) return true;
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

async function bootstrap() {
  assertEnv();
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
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

  await app.listen(3000, '0.0.0.0');
}
bootstrap();
