import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();

  const publicPath = join(__dirname, '..', 'public');
  console.log(`🔍 Public path: ${publicPath}`);
  app.useStaticAssets(publicPath);

  const viewsPath = join(__dirname, '..', 'views');
  console.log(`👁️  Views path: ${viewsPath}`);
  app.setBaseViewsDir(viewsPath);
  app.setViewEngine('hbs');

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 AI Agent is running on: http://localhost:${port}`);
  console.log(`📎 Hyperspell Connect page: http://localhost:${port}/hyperspell-connect.html`);
}

bootstrap();
