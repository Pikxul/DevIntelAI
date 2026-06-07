import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PolicyEngineService } from './policy-engine.service';
import { PolicyEngineController } from './policy-engine.controller';
import { PipelinePolicy } from '../../entities/PipelinePolicy';
import { Project } from '../../entities';
import { GovernanceModule } from '../governance/governance.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PipelinePolicy, Project]),
    GovernanceModule,
  ],
  controllers: [PolicyEngineController],
  providers: [PolicyEngineService],
  exports: [PolicyEngineService],
})
export class PolicyEngineModule {}
