import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { GovernanceService } from './governance.service';
import { GovernanceController } from './governance.controller';
import { User, Organization, ApprovalRequestEntity, AuditLogEntity } from '../../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Organization, ApprovalRequestEntity, AuditLogEntity]),
    BullModule.registerQueue({ name: 'pipeline' }),
  ],
  controllers: [GovernanceController],
  providers: [GovernanceService],
  exports: [GovernanceService],
})
export class GovernanceModule {}
