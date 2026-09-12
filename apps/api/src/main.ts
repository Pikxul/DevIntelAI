import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

function validateEnv() {
  const logger = new Logger('Bootstrap');

  // Fatal: platform cannot start without these
  const required = ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET', 'NEXTAUTH_SECRET'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    logger.error('Set them in .env or as system environment variables. Exiting.');
    process.exit(1);
  }

  // Warn: OAuth will not work without these (non-fatal; dev-bypass mode still works)
  const oauth = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'];
  const missingOauth = oauth.filter((k) => !process.env[k]);
  if (missingOauth.length) {
    logger.warn(`GitHub OAuth not configured (missing: ${missingOauth.join(', ')}). Set NEXTAUTH_DEV_BYPASS=true for local dev.`);
  }

  // Warn: Notifications won't fire without at least one channel configured
  const hasSlack = process.env.SLACK_BOT_TOKEN || process.env.SLACK_WEBHOOK_URL;
  const hasTeams = process.env.TEAMS_WEBHOOK_URL;
  const hasJira  = process.env.JIRA_BASE_URL && process.env.JIRA_API_TOKEN;
  if (!hasSlack && !hasTeams && !hasJira) {
    logger.warn('No notification channels configured (Slack/Teams/Jira). Notifications will be silently skipped.');
  }
}

async function bootstrap() {
  validateEnv();

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
