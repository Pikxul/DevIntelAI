import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnomalyAlert } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([AnomalyAlert])],
  controllers: [MonitoringController],
  providers: [MonitoringService],
  exports: [MonitoringService],
})
export class MonitoringModule {}
