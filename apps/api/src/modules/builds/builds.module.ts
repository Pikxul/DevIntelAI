import { Module } from '@nestjs/common';
import { BuildsController } from './builds.controller';
import { BuildsService } from './builds.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PipelineRun } from '../../entities';
import { PipelinesModule } from '../pipelines/pipelines.module';

@Module({
  imports: [TypeOrmModule.forFeature([PipelineRun]), PipelinesModule],
  controllers: [BuildsController],
  providers: [BuildsService],
  exports: [BuildsService],
})
export class BuildsModule {}
