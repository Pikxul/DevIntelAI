import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
    cors: {
      origin: [
        'http://localhost:3000',
        process.env.FRONTEND_URL ?? 'http://localhost:3000',
      ],
      credentials: true,
    },
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Swagger API docs
  const config = new DocumentBuilder()
    .setTitle('AI DevOps Platform API')
    .setDescription('Centralized AI-powered DevOps pipeline orchestration')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('pipelines', 'Pipeline run management')
    .addTag('ai-review', 'AI code review endpoints')
    .addTag('builds', 'Docker build orchestration')
    .addTag('deployments', 'Deployment management')
    .addTag('monitoring', 'Metrics and anomaly detection')
    .addTag('webhooks', 'GitHub webhook receivers')
    .addTag('notifications', 'Slack/Teams/Jira notifications')
    .addTag('projects', 'Project management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 AI DevOps API running on http://localhost:${port}`);
  console.log(`📖 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
