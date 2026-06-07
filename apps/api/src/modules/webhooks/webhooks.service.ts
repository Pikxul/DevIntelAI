import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { PipelinesService } from '../pipelines/pipelines.service';
import { ConfigService } from '@nestjs/config';
import { WebhookEventEntity, CommitEntity, PullRequestEntity } from '../../entities';
import axios from 'axios';
import { AIReviewService } from '../ai-review/ai-review.service';
import { getAIClient } from '@aidevops/ai-client';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(WebhookEventEntity) private readonly eventRepo: Repository<WebhookEventEntity>,
    @InjectRepository(CommitEntity) private readonly commitRepo: Repository<CommitEntity>,
    @InjectRepository(PullRequestEntity) private readonly prRepo: Repository<PullRequestEntity>,
    private readonly pipelinesService: PipelinesService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => AIReviewService))
    private readonly aiReviewService: AIReviewService,
  ) {}

  verifyGitHubSignature(payload: string, signature: string, secret: string): boolean {
    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  /**
   * Logs incoming webhooks to the database for full SOC2 auditability (T1.1 / T2.4).
   */
  async logEvent(projectId: string, provider: string, eventType: string, payload: any): Promise<void> {
    try {
      const event = this.eventRepo.create({
        projectId: projectId === 'default-project' ? null : projectId,
        provider,
        eventType,
        payload,
        processed: true,
        processedAt: new Date(),
      });
      await this.eventRepo.save(event);
    } catch (err) {
      this.logger.error(`Failed to log webhook event to DB: ${err.message}`);
    }
  }

  async handlePushEvent(payload: GitHubPushPayload, projectId: string, orgId: string) {
    this.logger.log(`GitHub push: ${payload.ref} by ${payload.pusher.name}`);

    // Log the event to DB (T1.1 / T2.4)
    await this.logEvent(projectId, 'github', 'push', payload);

    // Compute diff first (needed for commit analysis and pipeline creation)
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

    if (!diff && payload.commits) {
      diff = payload.commits
        .map((c) => `commit ${c.id}\n${c.message}\nModified: ${c.modified?.join(', ')}\nAdded: ${c.added?.join(', ')}`)
        .join('\n\n');
    }

    // Save commit details to commits table (T2.6)
    if (payload.commits && payload.commits.length > 0) {
      try {
        const commitEntities = payload.commits.map((c) => {
          const commit = new CommitEntity();
          commit.projectId = projectId;
          commit.organizationId = orgId;
          commit.sha = c.id;
          commit.branch = payload.ref.replace('refs/heads/', '');
          commit.author = c.author?.name || payload.pusher.name || 'unknown';
          commit.message = c.message || '';
          commit.createdAt = c.timestamp ? new Date(c.timestamp) : new Date();
          return commit;
        });
        await this.commitRepo.save(commitEntities);
        this.logger.log(`Saved ${commitEntities.length} commits to commits table`);

        // Trigger background commit analysis (T3.5)
        commitEntities.forEach((c) => {
          this.analyzeCommitInBackground(c, diff, orgId);
        });
      } catch (err) {
        this.logger.error(`Failed to save commits to DB: ${err.message}`);
      }
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
    if (!['opened', 'synchronize', 'reopened', 'closed'].includes(payload.action)) return null;
    this.logger.log(`GitHub PR #${payload.pull_request.number}: ${payload.action}`);

    // Log the event to DB (T1.1 / T2.4)
    await this.logEvent(projectId, 'github', `pull_request_${payload.action}`, payload);

    // Save PR details to pull_requests table (T2.7)
    try {
      let pr = await this.prRepo.findOne({
        where: {
          projectId,
          number: payload.pull_request.number,
        },
      });

      if (!pr) {
        pr = new PullRequestEntity();
        pr.projectId = projectId;
        pr.organizationId = orgId;
        pr.number = payload.pull_request.number;
      }

      pr.title = payload.pull_request.title;
      pr.state = payload.pull_request.merged ? 'merged' : payload.pull_request.state;
      pr.author = payload.pull_request.user?.login || 'unknown';
      pr.url = payload.pull_request.html_url;
      pr.createdAt = new Date(payload.pull_request.created_at);
      pr.updatedAt = new Date(payload.pull_request.updated_at);
      pr.mergedAt = payload.pull_request.merged_at ? new Date(payload.pull_request.merged_at) : null;

      await this.prRepo.save(pr);
      this.logger.log(`Saved/updated PR #${pr.number} in pull_requests table`);

      // Trigger background PR analysis (T3.6)
      if (payload.action !== 'closed') {
        this.analyzePRInBackground(pr, payload.repository?.full_name ?? '', orgId);
      }
    } catch (err) {
      this.logger.error(`Failed to save pull request to DB: ${err.message}`);
    }

    if (payload.action === 'closed') {
      return { message: `Pull request #${payload.pull_request.number} closed event logged` };
    }

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

  async handleWorkflowRunEvent(payload: any, projectId: string, orgId: string) {
    this.logger.log(`Received GitHub workflow_run event for project ${projectId}`);
    await this.logEvent(projectId, 'github', 'workflow_run', payload);
    return { status: 'logged', event: 'workflow_run' };
  }

  async handleReleaseEvent(payload: any, projectId: string, orgId: string) {
    this.logger.log(`Received GitHub release event for project ${projectId}`);
    await this.logEvent(projectId, 'github', 'release', payload);
    return { status: 'logged', event: 'release' };
  }

  async handleCheckRunEvent(payload: any, projectId: string, orgId: string) {
    this.logger.log(`Received GitHub check_run event for project ${projectId}`);
    await this.logEvent(projectId, 'github', 'check_run', payload);
    return { status: 'logged', event: 'check_run' };
  }

  async handleDeploymentEvent(payload: any, projectId: string, orgId: string) {
    this.logger.log(`Received GitHub deployment event for project ${projectId}`);
    await this.logEvent(projectId, 'github', 'deployment', payload);
    return { status: 'logged', event: 'deployment' };
  }

  // ── GitLab ────────────────────────────────────────────────────────────────

  verifyGitLabToken(receivedToken: string, secret: string): boolean {
    if (!receivedToken || !secret) return false;
    try {
      return crypto.timingSafeEqual(
        Buffer.from(receivedToken, 'utf8'),
        Buffer.from(secret, 'utf8'),
      );
    } catch {
      return false;
    }
  }

  async handleGitLabPushEvent(payload: GitLabPushPayload, projectId: string, orgId: string) {
    this.logger.log(`GitLab push: ${payload.ref} by ${payload.user_name}`);

    // Log GitLab push event
    await this.logEvent(projectId, 'gitlab', 'push', payload);

    // Save GitLab commits
    if (payload.commits && payload.commits.length > 0) {
      try {
        const commitEntities = payload.commits.map((c) => {
          const commit = new CommitEntity();
          commit.projectId = projectId;
          commit.organizationId = orgId;
          commit.sha = c.id;
          commit.branch = payload.ref.replace('refs/heads/', '');
          commit.author = c.author?.name || payload.user_name || 'unknown';
          commit.message = c.message || '';
          commit.createdAt = new Date();
          return commit;
        });
        await this.commitRepo.save(commitEntities);
      } catch (err) {
        this.logger.error(`Failed to save GitLab commits: ${err.message}`);
      }
    }

    const diff = payload.commits
      .map(
        (c) =>
          `commit ${c.id}\n${c.message}\nModified: ${c.modified?.join(', ')}\nAdded: ${c.added?.join(', ')}`,
      )
      .join('\n\n');

    return this.pipelinesService.create({
      projectId,
      organizationId: orgId,
      commitSha: payload.checkout_sha ?? payload.after,
      branch: payload.ref.replace('refs/heads/', ''),
      author: payload.user_name,
      message: payload.commits[0]?.message ?? '',
      triggeredBy: 'push',
      diff,
    });
  }

  async handleGitLabMREvent(payload: GitLabMRPayload, projectId: string, orgId: string) {
    const { action } = payload.object_attributes;
    if (!['open', 'reopen', 'update'].includes(action)) return null;
    this.logger.log(`GitLab MR !${payload.object_attributes.iid}: ${action}`);

    // Log GitLab MR event
    await this.logEvent(projectId, 'gitlab', 'merge_request', payload);

    // Save GitLab PR
    try {
      let pr = await this.prRepo.findOne({
        where: {
          projectId,
          number: payload.object_attributes.iid,
        },
      });

      if (!pr) {
        pr = new PullRequestEntity();
        pr.projectId = projectId;
        pr.organizationId = orgId;
        pr.number = payload.object_attributes.iid;
      }

      pr.title = payload.object_attributes.title;
      pr.state = payload.object_attributes.action === 'merge' ? 'merged' : payload.object_attributes.state;
      pr.author = payload.user?.username || 'unknown';
      pr.url = payload.object_attributes.url;
      pr.createdAt = new Date();
      pr.updatedAt = new Date();

      await this.prRepo.save(pr);
    } catch (err) {
      this.logger.error(`Failed to save GitLab MR: ${err.message}`);
    }

    return this.pipelinesService.create({
      projectId,
      organizationId: orgId,
      commitSha: payload.object_attributes.last_commit.id,
      branch: payload.object_attributes.source_branch,
      author: payload.user.username,
      message: payload.object_attributes.title,
      prNumber: payload.object_attributes.iid,
      prUrl: payload.object_attributes.url,
      triggeredBy: 'pull_request',
      diff: `MR !${payload.object_attributes.iid}: ${payload.object_attributes.title}\nBase: ${payload.object_attributes.target_branch}`,
    });
  }

  // ─── Background AI Scoring & Summary (T3.5 / T3.6) ─────────────────────────

  async analyzeCommitInBackground(commit: CommitEntity, diff: string, orgId: string) {
    try {
      this.logger.log(`Background commit scoring starting for commit ${commit.sha.slice(0, 7)}`);
      const aiClient = getAIClient();
      
      const riskScore = await aiClient.analyzeRisk(diff || commit.message, commit.sha);
      
      commit.riskScore = riskScore.overall;
      commit.riskLevel = riskScore.level;
      commit.analysisSummary = riskScore.summary;
      
      await this.commitRepo.save(commit);
      this.logger.log(`Background commit scoring complete for commit ${commit.sha.slice(0, 7)}: Risk ${riskScore.overall}/100`);
    } catch (err) {
      this.logger.error(`Failed background commit analysis for ${commit.sha.slice(0, 7)}: ${err.message}`);
    }
  }

  async analyzePRInBackground(pr: PullRequestEntity, fullName: string, orgId: string) {
    try {
      this.logger.log(`Background PR analysis starting for PR #${pr.number}`);
      let diff = '';
      const token = this.configService.get<string>('GITHUB_TOKEN');
      
      if (token && fullName) {
        try {
          const res = await axios.get(
            `https://api.github.com/repos/${fullName}/pulls/${pr.number}`,
            {
              headers: {
                Authorization: `token ${token}`,
                Accept: 'application/vnd.github.v3.diff',
              },
            }
          );
          diff = res.data;
        } catch (err) {
          this.logger.warn(`Failed to fetch PR diff: ${err.message}`);
        }
      }

      if (!diff) {
        diff = `Pull Request #${pr.number}: ${pr.title}\nAuthor: ${pr.author}`;
      }

      const summaryResult = await this.aiReviewService.summarizePR(diff, pr.title);
      
      const aiClient = getAIClient();
      const reviewResult = await aiClient.reviewCode(diff, `pr-${pr.number}`, {
        branch: pr.url,
        author: pr.author,
        prTitle: pr.title,
      });

      pr.riskScore = reviewResult.riskScore.overall;
      pr.riskLevel = reviewResult.riskScore.level;
      pr.analysisSummary = summaryResult.summary;

      await this.prRepo.save(pr);
      this.logger.log(`Background PR analysis complete for PR #${pr.number}: Risk ${reviewResult.riskScore.overall}/100`);
    } catch (err) {
      this.logger.error(`Failed background PR analysis for #${pr.number}: ${err.message}`);
    }
  }
}

interface GitHubPushPayload {
  ref: string;
  after: string;
  pusher: { name: string };
  repository: { full_name: string };
  commits: Array<{ id: string; message: string; author?: { name: string }; timestamp?: string; modified?: string[]; added?: string[] }>;
}

interface GitHubPRPayload {
  action: string;
  repository?: { full_name: string };
  pull_request: {
    number: number;
    title: string;
    html_url: string;
    state: string;
    merged: boolean;
    created_at: string;
    updated_at: string;
    merged_at?: string;
    user: { login: string };
    head: { sha: string; ref: string };
    base: { ref: string };
  };
}

interface GitLabPushPayload {
  ref: string;
  after: string;
  checkout_sha?: string;
  user_name: string;
  repository: { name: string; homepage: string };
  commits: Array<{ id: string; message: string; author?: { name: string }; modified?: string[]; added?: string[] }>;
}

interface GitLabMRPayload {
  user: { username: string };
  object_attributes: {
    iid: number;
    title: string;
    action: string;
    state: string;
    source_branch: string;
    target_branch: string;
    url: string;
    last_commit: { id: string };
  };
}

