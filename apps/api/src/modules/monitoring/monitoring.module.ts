import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { IncidentsService } from './incidents.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnomalyAlert, IncidentAlertEntity, RootCauseAnalysisEntity, RollbackEventEntity } from '../../entities';
import { DeploymentsModule } from '../deployments/deployments.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnomalyAlert,
      IncidentAlertEntity,
      RootCauseAnalysisEntity,
      RollbackEventEntity,
    ]),
    DeploymentsModule,
    NotificationsModule
  ],
  controllers: [MonitoringController],
  providers: [MonitoringService, IncidentsService],
  exports: [MonitoringService, IncidentsService],
})
export class MonitoringModule {}
