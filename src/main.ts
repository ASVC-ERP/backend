import { config } from 'dotenv';
config();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { Console } from 'console';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: true,
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
