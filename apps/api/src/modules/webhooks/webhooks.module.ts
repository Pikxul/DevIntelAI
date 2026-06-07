import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { PipelinesModule } from '../pipelines/pipelines.module';
import { ProjectsModule } from '../projects/projects.module';
import { AIReviewModule } from '../ai-review/ai-review.module';
import { WebhookEventEntity, CommitEntity, PullRequestEntity } from '../../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookEventEntity, CommitEntity, PullRequestEntity]),
    PipelinesModule,
    ProjectsModule,
    forwardRef(() => AIReviewModule),
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
