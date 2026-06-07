import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class GitHubAppService {
  private readonly logger = new Logger(GitHubAppService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Generates a JWT signed with the GitHub App's private key (RS256).
   * Valid for 10 minutes (GitHub's maximum).
   */
  generateAppJwt(): string {
    const appId = this.configService.get<string>('GITHUB_APP_ID');
    const rawPrivateKey = this.configService.get<string>('GITHUB_APP_PRIVATE_KEY');

    if (!appId || !rawPrivateKey) {
      throw new Error('GITHUB_APP_ID or GITHUB_APP_PRIVATE_KEY is missing in env');
    }

    // Handle escaped newlines if passed in via single-line env
    const privateKey = rawPrivateKey.replace(/\\n/g, '\n').trim();

    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60,            // 60s buffer for clock drift
      exp: now + 9 * 60,        // 9 minutes expiration
      iss: appId,
    };

    const base64url = (str: string) =>
      Buffer.from(str)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    const unsignedToken = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(unsignedToken);
    const signature = sign.sign(privateKey, 'base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `${unsignedToken}.${signature}`;
  }

  /**
   * Requests an installation access token (IAT) for a specific GitHub App installation.
   */
  async getInstallationToken(installationId: number): Promise<string> {
    const jwt = this.generateAppJwt();
    try {
      const res = await axios.post(
        `https://api.github.com/app/installations/${installationId}/access_tokens`,
        {},
        {
          headers: {
            Authorization: `Bearer ${jwt}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'DevIntel-AI-App',
          },
        },
      );
      return res.data.token;
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      this.logger.error(`Failed to generate installation token for installation ${installationId}: ${msg}`);
      throw new Error(`GitHub App Token Generation failed: ${msg}`);
    }
  }

  /**
   * Lists repositories for a given installation.
   */
  async listInstallationRepos(installationId: number): Promise<any[]> {
    const token = await this.getInstallationToken(installationId);
    try {
      const res = await axios.get('https://api.github.com/installation/repositories', {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'DevIntel-AI-App',
        },
        params: { per_page: 100 },
      });
      return res.data.repositories.map((repo: any) => ({
        id: repo.id,
        fullName: repo.full_name,
        name: repo.name,
        private: repo.private,
        defaultBranch: repo.default_branch,
        description: repo.description || '',
        repoUrl: repo.html_url,
      }));
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      this.logger.error(`Failed to list installation repositories: ${msg}`);
      throw new Error(`GitHub Repos Listing failed: ${msg}`);
    }
  }

  /**
   * Registers a push & PR webhook on a connected repository.
   */
  async registerWebhook(
    installationId: number,
    repoFullName: string,
    projectId: string,
    orgId: string,
    webhookSecret: string,
  ): Promise<void> {
    const token = await this.getInstallationToken(installationId);
    const apiUrl = this.configService.get<string>('API_URL', 'http://localhost:3001');

    try {
      await axios.post(
        `https://api.github.com/repos/${repoFullName}/hooks`,
        {
          name: 'web',
          active: true,
          events: ['push', 'pull_request', 'workflow_run', 'release', 'check_run', 'deployment'],
          config: {
            url: `${apiUrl}/api/v1/webhooks/github?projectId=${projectId}&orgId=${orgId}`,
            content_type: 'json',
            secret: webhookSecret,
          },
        },
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'DevIntel-AI-App',
          },
        },
      );
      this.logger.log(`Successfully registered webhook on GitHub for ${repoFullName}`);
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      this.logger.warn(`Failed to auto-register webhook on GitHub for ${repoFullName}: ${msg}`);
    }
  }
}
