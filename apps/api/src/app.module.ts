import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { AuthModule } from './modules/auth/auth.module';
import { PipelinesModule } from './modules/pipelines/pipelines.module';
import { AIReviewModule } from './modules/ai-review/ai-review.module';
import { BuildsModule } from './modules/builds/builds.module';
import { DeploymentsModule } from './modules/deployments/deployments.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { GatewayModule } from './modules/gateway/gateway.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        url: cfg.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: cfg.get('NODE_ENV') !== 'production',
        logging: cfg.get('NODE_ENV') === 'development',
      }),
    }),

    // Redis / BullMQ Queues
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        redis: cfg.get<string>('REDIS_URL') ?? 'redis://localhost:6379',
      }),
    }),

    // Feature Modules
    AuthModule,
    PipelinesModule,
    AIReviewModule,
    BuildsModule,
    DeploymentsModule,
    MonitoringModule,
    WebhooksModule,
    NotificationsModule,
    ProjectsModule,
    GatewayModule,
  ],
})
export class AppModule {}
