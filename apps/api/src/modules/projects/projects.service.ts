import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Project, CommitEntity, PullRequestEntity, User } from '../../entities';
import { GitHubAppService } from './github-app.service';
import * as crypto from 'crypto';
import axios from 'axios';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @InjectRepository(Project) private repo: Repository<Project>,
    @InjectRepository(CommitEntity) private commitRepo: Repository<CommitEntity>,
    @InjectRepository(PullRequestEntity) private prRepo: Repository<PullRequestEntity>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private readonly configService: ConfigService,
    private readonly githubAppService: GitHubAppService,
  ) {}

  async create(data: Partial<Project>): Promise<Project> {
    // Auto-generate webhook secrets for new projects
    if (!data.webhookSecret) {
      data.webhookSecret = crypto.randomBytes(32).toString('hex');
    }
    if (!data.gitlabWebhookSecret) {
      data.gitlabWebhookSecret = crypto.randomBytes(32).toString('hex');
    }
    // Generate slug from name if not provided
    if (!data.slug && data.name) {
      data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    const project = this.repo.create(data);
    return this.repo.save(project);
  }

  async findAll(organizationId: string): Promise<Project[]> {
    return this.repo.find({ where: { organizationId }, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string, organizationId: string): Promise<Project | null> {
    return this.repo.findOne({ where: { id, organizationId } });
  }

  async findByGithubRepo(fullName: string, organizationId: string): Promise<Project | null> {
    return this.repo.findOne({ where: { githubRepoFullName: fullName, organizationId } });
  }

  /** Used by the GitLab webhook controller to match a repo by its web URL. */
  async findByRepoUrl(repoUrl: string, organizationId: string): Promise<Project | null> {
    return this.repo.findOne({ where: { repoUrl, organizationId } });
  }

  async update(id: string, data: Partial<Project>, organizationId: string): Promise<Project | null> {
    await this.repo.update({ id, organizationId }, data);
    return this.findOne(id, organizationId);
  }

  /**
   * List GitHub repositories accessible by the configured GITHUB_TOKEN.
   * In a full implementation, this would use the user's OAuth token.
   */
  async listGitHubRepos(): Promise<Array<{ fullName: string; description: string; defaultBranch: string; private: boolean }>> {
    const token = this.configService.get<string>('GITHUB_TOKEN');
    if (!token) {
      this.logger.warn('GITHUB_TOKEN not configured, cannot list repositories');
      return [];
    }

    try {
      const res = await axios.get('https://api.github.com/user/repos', {
        headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
        params: { per_page: 50, sort: 'updated', direction: 'desc' },
      });
      return res.data.map((repo: any) => ({
        fullName: repo.full_name,
        description: repo.description || '',
        defaultBranch: repo.default_branch,
        private: repo.private,
      }));
    } catch (err) {
      this.logger.error(`Failed to list GitHub repos: ${err.message}`);
      return [];
    }
  }

  /**
   * List GitHub repositories accessible by the authenticated user's own GitHub OAuth token.
   * Falls back to the server-side GITHUB_TOKEN if the user has no stored token.
   */
  async listUserGitHubRepos(userId: string): Promise<Array<{
    fullName: string;
    name: string;
    description: string;
    defaultBranch: string;
    private: boolean;
    language: string;
    stars: number;
    updatedAt: string;
  }>> {
    // Try user's own GitHub OAuth token first
    const user = await this.userRepo.findOne({ where: { id: userId }, select: ['id', 'githubAccessToken'] });
    let token = user?.githubAccessToken;

    // Fallback to server-side token
    if (!token) {
      token = this.configService.get<string>('GITHUB_TOKEN');
    }

    if (!token) {
      this.logger.warn(`No GitHub token available for user ${userId}`);
      return [];
    }

    try {
      // Fetch up to 100 repos, sorted by most recently updated
      const res = await axios.get('https://api.github.com/user/repos', {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'DevIntel-AI-App',
        },
        params: { per_page: 100, sort: 'updated', direction: 'desc', affiliation: 'owner,collaborator,organization_member' },
      });
      return res.data.map((repo: any) => ({
        fullName: repo.full_name,
        name: repo.name,
        description: repo.description || '',
        defaultBranch: repo.default_branch,
        private: repo.private,
        language: repo.language || '',
        stars: repo.stargazers_count || 0,
        updatedAt: repo.updated_at || '',
      }));
    } catch (err) {
      if (err.response?.status === 401) {
        this.logger.warn(`GitHub token expired/revoked for user ${userId}`);
        // Clear the invalid token
        await this.userRepo.update(userId, { githubAccessToken: null as any });
      }
      this.logger.error(`Failed to list user's GitHub repos: ${err.message}`);
      return [];
    }
  }

  /**
   * Connect a GitHub repository by creating a project and optionally registering a webhook.
   */
  async connectGitHubRepo(params: {
    organizationId: string;
    repoFullName: string;
    name: string;
    defaultBranch?: string;
    userId?: string;
  }): Promise<Project> {
    const webhookSecret = crypto.randomBytes(32).toString('hex');
    const project = await this.create({
      organizationId: params.organizationId,
      name: params.name,
      repoUrl: `https://github.com/${params.repoFullName}`,
      repoProvider: 'github',
      githubRepoFullName: params.repoFullName,
      defaultBranch: params.defaultBranch || 'main',
      webhookSecret,
    });

    // Attempt to register webhook on GitHub — prefer user's token
    let token: string | undefined;
    if (params.userId) {
      const user = await this.userRepo.findOne({ where: { id: params.userId }, select: ['id', 'githubAccessToken'] });
      token = user?.githubAccessToken;
    }
    if (!token) {
      token = this.configService.get<string>('GITHUB_TOKEN');
    }
    const apiUrl = this.configService.get<string>('API_URL', 'http://localhost:3001');
    if (token) {
      try {
        await axios.post(
          `https://api.github.com/repos/${params.repoFullName}/hooks`,
          {
            name: 'web',
            active: true,
            events: ['push', 'pull_request'],
            config: {
              url: `${apiUrl}/api/v1/webhooks/github?projectId=${project.id}&orgId=${params.organizationId}`,
              content_type: 'json',
              secret: webhookSecret,
            },
          },
          {
            headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
          },
        );
        this.logger.log(`Webhook registered for ${params.repoFullName}`);
      } catch (err) {
        this.logger.warn(`Failed to auto-register webhook on GitHub: ${err.message}. You can add it manually.`);
      }

      // Trigger initial sync using the token
      this.triggerTokenSync(params.repoFullName, project.id, params.organizationId, project.defaultBranch)
        .catch((err) => this.logger.error(`Initial token sync failed for ${params.repoFullName}: ${err.message}`));
    }

    return project;
  }

  /**
   * Connect a repository via GitHub App installation (T2.2).
   */
  async connectGitHubAppRepo(params: {
    organizationId: string;
    installationId: number;
    repoFullName: string;
    name: string;
    defaultBranch?: string;
  }): Promise<Project> {
    const webhookSecret = crypto.randomBytes(32).toString('hex');
    const project = await this.create({
      organizationId: params.organizationId,
      name: params.name,
      repoUrl: `https://github.com/${params.repoFullName}`,
      repoProvider: 'github',
      githubRepoFullName: params.repoFullName,
      defaultBranch: params.defaultBranch || 'main',
      webhookSecret,
    });

    // Register webhook via GitHub App installation (T2.2 / T2.3)
    await this.githubAppService.registerWebhook(
      params.installationId,
      params.repoFullName,
      project.id,
      params.organizationId,
      webhookSecret,
    );

    // Trigger Initial Sync in background (T2.5)
    this.triggerInitialSync(params.installationId, params.repoFullName, project.id, params.organizationId, project.defaultBranch)
      .catch((err) => this.logger.error(`Initial sync failed for ${params.repoFullName}: ${err.message}`));

    return project;
  }

  /**
   * Fetches commit history + PRs on repository connection (T2.5).
   */
  async triggerInitialSync(
    installationId: number,
    repoFullName: string,
    projectId: string,
    organizationId: string,
    defaultBranch: string = 'main',
  ): Promise<void> {
    this.logger.log(`🔄 Beginning initial sync for repo ${repoFullName} via GitHub App...`);
    try {
      const token = await this.githubAppService.getInstallationToken(installationId);
      await this.performSyncWithToken(token, repoFullName, projectId, organizationId, defaultBranch);
    } catch (err) {
      this.logger.error(`Initial sync failed: ${err.message}`);
    }
  }

  async triggerTokenSync(
    repoFullName: string,
    projectId: string,
    organizationId: string,
    defaultBranch: string = 'main',
  ): Promise<void> {
    this.logger.log(`🔄 Beginning initial sync for repo ${repoFullName} via personal token...`);
    try {
      const token = this.configService.get<string>('GITHUB_TOKEN');
      if (!token) throw new Error('GITHUB_TOKEN not configured');
      await this.performSyncWithToken(token, repoFullName, projectId, organizationId, defaultBranch);
    } catch (err) {
      this.logger.error(`Initial token sync failed: ${err.message}`);
    }
  }

  private async performSyncWithToken(
    token: string,
    repoFullName: string,
    projectId: string,
    organizationId: string,
    defaultBranch: string,
  ): Promise<void> {
    await this.repo.update(projectId, { syncStatus: 'syncing' });
    try {
      // 1. Sync Commits (T2.6)
    const commitsRes = await axios.get(`https://api.github.com/repos/${repoFullName}/commits`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'DevIntel-AI-App',
      },
      params: { per_page: 20 },
    });

    const commitEntities = commitsRes.data.map((c: any) => {
      const commit = new CommitEntity();
      commit.projectId = projectId;
      commit.organizationId = organizationId;
      commit.sha = c.sha;
      commit.branch = defaultBranch;
      commit.author = c.commit?.author?.name || c.author?.login || 'unknown';
      commit.message = c.commit?.message || '';
      commit.createdAt = new Date(c.commit?.author?.date || Date.now());
      return commit;
    });

    await this.commitRepo.save(commitEntities);
    this.logger.log(`✅ Synced ${commitEntities.length} commits for ${repoFullName}`);

    // 2. Sync Pull Requests (T2.7)
    const prsRes = await axios.get(`https://api.github.com/repos/${repoFullName}/pulls`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'DevIntel-AI-App',
      },
      params: { state: 'all', per_page: 20 },
    });

    const prEntities = prsRes.data.map((p: any) => {
      const pr = new PullRequestEntity();
      pr.projectId = projectId;
      pr.organizationId = organizationId;
      pr.number = p.number;
      pr.title = p.title;
      pr.state = p.state === 'closed' && p.merged_at ? 'merged' : p.state;
      pr.author = p.user?.login || 'unknown';
      pr.url = p.html_url;
      pr.createdAt = new Date(p.created_at);
      pr.updatedAt = new Date(p.updated_at);
      pr.mergedAt = p.merged_at ? new Date(p.merged_at) : null;
      return pr;
    });

    await this.prRepo.save(prEntities);
    this.logger.log(`✅ Synced ${prEntities.length} pull requests for ${repoFullName}`);
    
    await this.repo.update(projectId, { syncStatus: 'completed', lastSyncedAt: new Date() });
  } catch (err) {
    this.logger.error(`Perform sync failed: ${err.message}`);
    await this.repo.update(projectId, { syncStatus: 'failed' });
    throw err;
  }
}

  async getSyncStatus(projectId: string, organizationId: string): Promise<{ status: string; lastSyncedAt: Date | null }> {
    const project = await this.repo.findOne({ where: { id: projectId, organizationId }, select: ['syncStatus', 'lastSyncedAt'] });
    if (!project) throw new Error('Project not found');
    return { status: project.syncStatus, lastSyncedAt: project.lastSyncedAt };
  }

  async findCommits(projectId: string, organizationId: string): Promise<CommitEntity[]> {
    return this.commitRepo.find({ where: { projectId, organizationId }, order: { createdAt: 'DESC' }, take: 100 });
  }

  async findPullRequests(projectId: string, organizationId: string): Promise<PullRequestEntity[]> {
    return this.prRepo.find({ where: { projectId, organizationId }, order: { createdAt: 'DESC' }, take: 100 });
  }
}
