import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project, CommitEntity, PullRequestEntity, User } from '../../entities';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { GitHubAppService } from './github-app.service';

@Module({
  imports: [TypeOrmModule.forFeature([Project, CommitEntity, PullRequestEntity, User])],
  controllers: [ProjectsController],
  providers: [ProjectsService, GitHubAppService],
  exports: [ProjectsService, GitHubAppService],
})
export class ProjectsModule {}
