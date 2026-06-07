import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { SecretsModule } from './modules/secrets/secrets.module';
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
import { PolicyEngineModule } from './modules/policy-engine/policy-engine.module';
import { GovernanceModule } from './modules/governance/governance.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { HealthModule } from './modules/health/health.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { RateLimitGuard } from './modules/auth/rate-limit.guard';
import { TenantGuard } from './modules/auth/tenant.guard';
import { IdempotencyInterceptor } from './modules/auth/idempotency.interceptor';
import { LoggingMiddleware } from './modules/auth/logging.middleware';

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
        synchronize: cfg.get<string>('TYPEORM_SYNC') === 'true',
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
    SecretsModule,
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
    PolicyEngineModule,
    GovernanceModule,
    AnalyticsModule,
    HealthModule,
    OrganizationsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    {
      // TenantGuard runs globally after JWT auth to prevent cross-tenant access.
      // Routes that don't use JWT (public webhooks etc.) must use @SkipTenantCheck().
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
