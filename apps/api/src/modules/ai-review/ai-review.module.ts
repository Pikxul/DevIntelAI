import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { PolicyEngineModule } from '../policy-engine/policy-engine.module';
import { AIReviewResult, CommitEntity, IncidentAlertEntity } from '../../entities';
import { AIReviewController } from './ai-review.controller';
import { AIReviewService } from './ai-review.service';
import { AIReviewProcessor } from './ai-review.processor';
import { PipelinesModule } from '../pipelines/pipelines.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AIReviewResult, CommitEntity, IncidentAlertEntity]),
    BullModule.registerQueue({ name: 'ai-review' }),
    forwardRef(() => PipelinesModule),
    PolicyEngineModule,
  ],
  controllers: [AIReviewController],
  providers: [AIReviewService, AIReviewProcessor],
  exports: [AIReviewService],
})
export class AIReviewModule {}
