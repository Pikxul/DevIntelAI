import { Controller, Post, Headers, Body, RawBodyRequest, BadRequestException, Logger, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { ProjectsService } from '../projects/projects.service';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { SkipTenantCheck } from '../auth/skip-tenant-check.decorator';
import { VaultService } from '../secrets/vault.service';

@ApiTags('webhooks')
@SkipTenantCheck()
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly service: WebhooksService,
    private readonly projectsService: ProjectsService,
    private readonly cfg: ConfigService,
    private readonly vaultService: VaultService,
  ) {}

  @Post('github')
  @ApiOperation({ summary: 'Receive GitHub webhook events' })
  async githubWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-github-event') event: string,
    @Headers('x-hub-signature-256') signature: string,
    @Body() body: Record<string, unknown>,
    @Query('projectId') projectId?: string,
    @Query('orgId') orgId?: string,
  ) {
    // Determine project context (from query param or auto-detect from repo)
    let resolvedProjectId = projectId || 'default-project';
    let resolvedOrgId = orgId || 'default-org';
    let webhookSecret = this.cfg.get<string>('GITHUB_WEBHOOK_SECRET', '');

    // Try to auto-detect project from repo fullname
    const repoFullName = (body as any).repository?.full_name;
    if (repoFullName) {
      const project = await this.projectsService.findByGithubRepo(repoFullName);
      if (project) {
        resolvedProjectId = project.id;
        resolvedOrgId = project.organizationId;
        // Use per-project webhook secret if available
        if (project.vaultSecretPath) {
          const vaultSecret = await this.vaultService.getSecret(project.vaultSecretPath);
          if (vaultSecret && vaultSecret.webhookSecret) {
            webhookSecret = vaultSecret.webhookSecret;
          }
        } else if (project.webhookSecret) {
          webhookSecret = project.webhookSecret;
        }
      }
    }

    // Validate webhook signature
    const skipValidation = this.cfg.get<string>('GITHUB_WEBHOOK_SKIP_VALIDATION') === 'true';
    if (webhookSecret && !skipValidation) {
      if (!signature) {
        throw new BadRequestException('Missing webhook signature');
      }
      if (!req.rawBody) {
        throw new BadRequestException('Missing raw request body for signature verification');
      }
      const valid = this.service.verifyGitHubSignature(req.rawBody.toString(), signature, webhookSecret);
      if (!valid) throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Received GitHub event: ${event} for project ${resolvedProjectId}`);

    switch (event) {
      case 'push':
        return this.service.handlePushEvent(body as never, resolvedProjectId, resolvedOrgId);
      case 'pull_request':
        return this.service.handlePullRequestEvent(body as never, resolvedProjectId, resolvedOrgId);
      case 'workflow_run':
        return this.service.handleWorkflowRunEvent(body as never, resolvedProjectId, resolvedOrgId);
      case 'release':
        return this.service.handleReleaseEvent(body as never, resolvedProjectId, resolvedOrgId);
      case 'check_run':
        return this.service.handleCheckRunEvent(body as never, resolvedProjectId, resolvedOrgId);
      case 'deployment':
        return this.service.handleDeploymentEvent(body as never, resolvedProjectId, resolvedOrgId);
      default:
        return { message: `Event '${event}' received but not processed` };
    }
  }

  @Post('gitlab')
  @ApiOperation({ summary: 'Receive GitLab webhook events' })
  async gitlabWebhook(
    @Headers('x-gitlab-event') event: string,
    @Headers('x-gitlab-token') token: string,
    @Body() body: Record<string, unknown>,
    @Query('projectId') projectId?: string,
    @Query('orgId') orgId?: string,
  ) {
    let resolvedProjectId = projectId || 'default-project';
    let resolvedOrgId = orgId || 'default-org';

    // Try to auto-detect project from repo homepage URL
    const repoHomepage: string = (body as any).repository?.homepage ?? '';
    if (repoHomepage) {
      const project = await this.projectsService.findByRepoUrl(repoHomepage);
      if (project) {
        resolvedProjectId = project.id;
        resolvedOrgId = project.organizationId;

        // Validate per-project GitLab secret token
        let secret = this.cfg.get<string>('GITLAB_WEBHOOK_SECRET', '');
        if (project.vaultSecretPath) {
          const vaultSecret = await this.vaultService.getSecret(project.vaultSecretPath);
          if (vaultSecret && vaultSecret.gitlabWebhookSecret) {
            secret = vaultSecret.gitlabWebhookSecret;
          }
        } else if ((project as any).gitlabWebhookSecret) {
          secret = (project as any).gitlabWebhookSecret;
        }

        if (secret) {
          const valid = this.service.verifyGitLabToken(token, secret);
          if (!valid) throw new BadRequestException('Invalid GitLab webhook token');
        }
      }
    } else {
      // Fall back to global GitLab secret
      const secret = this.cfg.get<string>('GITLAB_WEBHOOK_SECRET', '');
      if (secret) {
        const valid = this.service.verifyGitLabToken(token, secret);
        if (!valid) throw new BadRequestException('Invalid GitLab webhook token');
      }
    }

    this.logger.log(`Received GitLab event: ${event} for project ${resolvedProjectId}`);

    switch (event) {
      case 'Push Hook':
      case 'Tag Push Hook':
        return this.service.handleGitLabPushEvent(body as never, resolvedProjectId, resolvedOrgId);
      case 'Merge Request Hook':
        return this.service.handleGitLabMREvent(body as never, resolvedProjectId, resolvedOrgId);
      default:
        return { message: `GitLab event '${event}' received but not processed` };
    }
  }
}

