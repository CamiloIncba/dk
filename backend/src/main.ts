import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS para permitir PWAs (cajero, display público)
  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? [
            // Dominios de producción (ajustar según infraestructura)
            /\.norpan\.com$/,
          ]
        : true, // En desarrollo, permite cualquier origen
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-API-KEY', 'Authorization'],
    credentials: true,
  });

  const port = process.env.PORT ?? 3010;
  await app.listen(port);
  console.log(`🚀 Backend running on http://localhost:${port}`);
}
bootstrap();
