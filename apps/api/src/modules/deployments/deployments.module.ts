import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Deployment } from '../../entities';
import { DeploymentsController } from './deployments.controller';
import { DeploymentsService } from './deployments.service';
import { PipelinesModule } from '../pipelines/pipelines.module';
import { GovernanceModule } from '../governance/governance.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Deployment]),
    forwardRef(() => PipelinesModule),
    GovernanceModule,
  ],
  controllers: [DeploymentsController],
  providers: [DeploymentsService],
  exports: [DeploymentsService],
})
export class DeploymentsModule {}
