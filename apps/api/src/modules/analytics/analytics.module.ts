import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { PipelineRun, Deployment, IncidentAlertEntity, RollbackEventEntity } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([PipelineRun, Deployment, IncidentAlertEntity, RollbackEventEntity])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
