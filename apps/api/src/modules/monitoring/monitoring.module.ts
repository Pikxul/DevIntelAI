import { Module, forwardRef } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { IncidentsService } from './incidents.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnomalyAlert, IncidentAlertEntity, RootCauseAnalysisEntity, RollbackEventEntity, IncidentTimelineEntity } from '../../entities';
import { DeploymentsModule } from '../deployments/deployments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnomalyAlert,
      IncidentAlertEntity,
      RootCauseAnalysisEntity,
      RollbackEventEntity,
      IncidentTimelineEntity,
    ]),
    DeploymentsModule,
    NotificationsModule,
    forwardRef(() => GatewayModule),
  ],
  controllers: [MonitoringController],
  providers: [MonitoringService, IncidentsService],
  exports: [MonitoringService, IncidentsService],
})
export class MonitoringModule {}
