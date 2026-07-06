import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { GitHubAppService } from './github-app.service';
import { Project } from '../../entities';

import { RequirePermission } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
/**
 * Note on Naming/Aliasing:
 * Per the TRD Repository Domain requirement, 'repositories' and 'projects' are synonymous
 * in this platform. We support both '/projects' and '/repositories' routing endpoints
 * as direct aliases to maintain full backwards compatibility while adhering to the TRD.
 */
@Controller(['projects', 'repositories'])
export class ProjectsController {
  constructor(
    private readonly service: ProjectsService,
    private readonly githubAppService: GitHubAppService,
  ) {}

  @Post() @RequirePermission('repo:connect') create(@Body() body: Partial<Project>, @Request() req: any) { return this.service.create({ ...body, organizationId: req.user.organizationId }); }
  @Get() @RequirePermission('repo:view') findAll(@Request() req: any) { return this.service.findAll(req.user.organizationId); }
  @Get(':id') @RequirePermission('repo:view') findOne(@Param('id') id: string, @Request() req: any) { return this.service.findOne(id, req.user.organizationId); }
  @Put(':id') @RequirePermission('repo:manage') update(@Param('id') id: string, @Body() body: Partial<Project>, @Request() req: any) { return this.service.update(id, body, req.user.organizationId); }

  @Get('github/repos')
  @RequirePermission('repo:view')
  @ApiOperation({ summary: 'List GitHub repositories available for connection' })
  listGitHubRepos() {
    return this.service.listGitHubRepos();
  }

  @Get('github/user-repos')
  @RequirePermission('repo:view')
  @ApiOperation({ summary: 'List GitHub repositories accessible to the authenticated user' })
  listUserGitHubRepos(@Request() req: any) {
    const userId = req.user?.userId ?? req.user?.sub;
    return this.service.listUserGitHubRepos(userId);
  }

  @Post('connect-github')
  @RequirePermission('repo:connect')
  @ApiOperation({ summary: 'Connect a GitHub repository (creates project + registers webhook)' })
  connectGitHub(@Body() body: {
    repoFullName: string;
    name: string;
    defaultBranch?: string;
  }, @Request() req: any) {
    const userId = req.user?.userId ?? req.user?.sub;
    return this.service.connectGitHubRepo({ ...body, organizationId: req.user.organizationId, userId });
  }

  @Get('github/installations/:installationId/repos')
  @RequirePermission('repo:view')
  @ApiOperation({ summary: 'List repositories accessible to a GitHub App installation' })
  listAppRepos(@Param('installationId') installationId: string) {
    return this.githubAppService.listInstallationRepos(parseInt(installationId));
  }

  @Post('github/connect-app-repo')
  @RequirePermission('repo:connect')
  @ApiOperation({ summary: 'Connect a repository via GitHub App' })
  connectAppRepo(
    @Body() body: {
      installationId: number;
      repoFullName: string;
      name: string;
      defaultBranch?: string;
    },
    @Request() req: any
  ) {
    return this.service.connectGitHubAppRepo({ ...body, organizationId: req.user.organizationId });
  }

  @Get(':id/commits')
  @RequirePermission('repo:view')
  @ApiOperation({ summary: 'List commits for a specific project/repository' })
  getCommits(@Param('id') id: string, @Request() req: any) {
    return this.service.findCommits(id, req.user.organizationId);
  }

  @Get(':id/sync-status')
  @RequirePermission('repo:view')
  @ApiOperation({ summary: 'Get the background sync status for a project' })
  getSyncStatus(@Param('id') id: string, @Request() req: any) {
    return this.service.getSyncStatus(id, req.user.organizationId);
  }

  @Get(':id/pull-requests')
  @RequirePermission('repo:view')
  @ApiOperation({ summary: 'List pull requests for a specific project/repository' })
  getPullRequests(@Param('id') id: string, @Request() req: any) {
    return this.service.findPullRequests(id, req.user.organizationId);
  }
}
