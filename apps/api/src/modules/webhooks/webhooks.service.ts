import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PipelinesService } from '../pipelines/pipelines.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly pipelinesService: PipelinesService,
    private readonly configService: ConfigService,
  ) {}

  verifyGitHubSignature(payload: string, signature: string, secret: string): boolean {
    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  }

  async handlePushEvent(payload: GitHubPushPayload, projectId: string, orgId: string) {
    this.logger.log(`GitHub push: ${payload.ref} by ${payload.pusher.name}`);

    // Try to fetch real diff from GitHub API if token is provided
    let diff = '';
    const token = this.configService.get<string>('GITHUB_TOKEN');
    if (token && payload.repository?.full_name && payload.after !== '0000000000000000000000000000000000000000') {
      try {
        const res = await axios.get(
          `https://api.github.com/repos/${payload.repository.full_name}/commits/${payload.after}`,
          {
            headers: {
              Authorization: `token ${token}`,
              Accept: 'application/vnd.github.v3.diff',
            },
          }
        );
        diff = res.data;
      } catch (err) {
        this.logger.warn(`Failed to fetch real diff from GitHub: ${err.message}`);
      }
    }

    if (!diff) {
      // Fallback to synthetic diff
      diff = payload.commits
        .map((c) => `commit ${c.id}\n${c.message}\nModified: ${c.modified?.join(', ')}\nAdded: ${c.added?.join(', ')}`)
        .join('\n\n');
    }

    return this.pipelinesService.create({
      projectId,
      organizationId: orgId,
      commitSha: payload.after,
      branch: payload.ref.replace('refs/heads/', ''),
      author: payload.pusher.name,
      message: payload.commits[0]?.message ?? '',
      triggeredBy: 'push',
      diff,
    });
  }

  async handlePullRequestEvent(payload: GitHubPRPayload, projectId: string, orgId: string) {
    if (!['opened', 'synchronize', 'reopened'].includes(payload.action)) return null;
    this.logger.log(`GitHub PR #${payload.pull_request.number}: ${payload.action}`);

    return this.pipelinesService.create({
      projectId,
      organizationId: orgId,
      commitSha: payload.pull_request.head.sha,
      branch: payload.pull_request.head.ref,
      author: payload.pull_request.user.login,
      message: payload.pull_request.title,
      prNumber: payload.pull_request.number,
      prUrl: payload.pull_request.html_url,
      triggeredBy: 'pull_request',
      diff: `PR #${payload.pull_request.number}: ${payload.pull_request.title}\nBase: ${payload.pull_request.base.ref}`,
    });
  }
}

// Minimal GitHub event payload types
interface GitHubPushPayload {
  ref: string;
  after: string;
  pusher: { name: string };
  repository: { full_name: string };
  commits: Array<{ id: string; message: string; modified?: string[]; added?: string[] }>;
}

interface GitHubPRPayload {
  action: string;
  pull_request: {
    number: number;
    title: string;
    html_url: string;
    user: { login: string };
    head: { sha: string; ref: string };
    base: { ref: string };
  };
}
