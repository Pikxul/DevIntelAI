import { Controller, Post, Headers, Body, RawBodyRequest, BadRequestException, Logger, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly service: WebhooksService,
    private readonly cfg: ConfigService,
  ) {}

  @Post('github')
  @ApiOperation({ summary: 'Receive GitHub webhook events' })
  async githubWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-github-event') event: string,
    @Headers('x-hub-signature-256') signature: string,
    @Body() body: Record<string, unknown>,
    @Query('projectId') projectId = 'default-project',
    @Query('orgId') orgId = 'default-org',
  ) {
    const secret = this.cfg.get<string>('GITHUB_WEBHOOK_SECRET', '');

    if (secret && signature && req.rawBody) {
      const valid = this.service.verifyGitHubSignature(req.rawBody.toString(), signature, secret);
      if (!valid) throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Received GitHub event: ${event}`);

    switch (event) {
      case 'push':
        return this.service.handlePushEvent(body as never, projectId, orgId);
      case 'pull_request':
        return this.service.handlePullRequestEvent(body as never, projectId, orgId);
      default:
        return { message: `Event '${event}' received but not processed` };
    }
  }
}
