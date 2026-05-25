import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PolicyEngineService } from './policy-engine.service';
import { PolicyEngineController } from './policy-engine.controller';
import { PipelinePolicy } from '../../entities/PipelinePolicy';

@Module({
  imports: [TypeOrmModule.forFeature([PipelinePolicy])],
  controllers: [PolicyEngineController],
  providers: [PolicyEngineService],
  exports: [PolicyEngineService],
})
export class PolicyEngineModule {}
