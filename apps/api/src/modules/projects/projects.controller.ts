import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { GitHubAppService } from './github-app.service';
import { Project } from '../../entities';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
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

  @Post() create(@Body() body: Partial<Project>) { return this.service.create(body); }
  @Get() findAll(@Query('organizationId') orgId: string) { return this.service.findAll(orgId); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Put(':id') update(@Param('id') id: string, @Body() body: Partial<Project>) { return this.service.update(id, body); }

  @Get('github/repos')
  @ApiOperation({ summary: 'List GitHub repositories available for connection' })
  listGitHubRepos() {
    return this.service.listGitHubRepos();
  }

  @Get('github/user-repos')
  @ApiOperation({ summary: 'List GitHub repositories accessible to the authenticated user' })
  listUserGitHubRepos(@Request() req: any) {
    const userId = req.user?.userId ?? req.user?.sub;
    return this.service.listUserGitHubRepos(userId);
  }

  @Post('connect-github')
  @ApiOperation({ summary: 'Connect a GitHub repository (creates project + registers webhook)' })
  connectGitHub(@Body() body: {
    organizationId: string;
    repoFullName: string;
    name: string;
    defaultBranch?: string;
  }, @Request() req: any) {
    const userId = req.user?.userId ?? req.user?.sub;
    return this.service.connectGitHubRepo({ ...body, userId });
  }

  @Get('github/installations/:installationId/repos')
  @ApiOperation({ summary: 'List repositories accessible to a GitHub App installation' })
  listAppRepos(@Param('installationId') installationId: string) {
    return this.githubAppService.listInstallationRepos(parseInt(installationId));
  }

  @Post('github/connect-app-repo')
  @ApiOperation({ summary: 'Connect a repository via GitHub App' })
  connectAppRepo(
    @Body() body: {
      organizationId: string;
      installationId: number;
      repoFullName: string;
      name: string;
      defaultBranch?: string;
    },
  ) {
    return this.service.connectGitHubAppRepo(body);
  }

  @Get(':id/commits')
  @ApiOperation({ summary: 'List commits for a specific project/repository' })
  getCommits(@Param('id') id: string) {
    return this.service.findCommits(id);
  }

  @Get(':id/sync-status')
  @ApiOperation({ summary: 'Get the background sync status for a project' })
  getSyncStatus(@Param('id') id: string) {
    return this.service.getSyncStatus(id);
  }

  @Get(':id/pull-requests')
  @ApiOperation({ summary: 'List pull requests for a specific project/repository' })
  getPullRequests(@Param('id') id: string) {
    return this.service.findPullRequests(id);
  }
}
