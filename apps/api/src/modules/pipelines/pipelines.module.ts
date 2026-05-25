import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { PipelineRun } from '../../entities';
import { PipelinesController } from './pipelines.controller';
import { PipelinesService } from './pipelines.service';
import { PipelineProcessor } from './pipeline.processor';
import { AIReviewModule } from '../ai-review/ai-review.module';
import { PolicyEngineModule } from '../policy-engine/policy-engine.module';
import { GovernanceModule } from '../governance/governance.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProjectsModule } from '../projects/projects.module';
import { DeploymentsModule } from '../deployments/deployments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PipelineRun]),
    BullModule.registerQueue({ name: 'pipeline' }),
    // Processor dependencies
    forwardRef(() => AIReviewModule),
    forwardRef(() => DeploymentsModule),
    PolicyEngineModule,
    GovernanceModule,
    NotificationsModule,
    ProjectsModule,
  ],
  controllers: [PipelinesController],
  providers: [PipelinesService, PipelineProcessor],
  exports: [PipelinesService],
})
export class PipelinesModule {}
