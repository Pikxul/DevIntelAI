import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as nodemailer from 'nodemailer';

export interface SlackMessage {
  channel?: string;
  text: string;
  blocks?: SlackBlock[];
}

interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
  elements?: unknown[];
}

type PipelineStatus = 'success' | 'failed' | 'blocked';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly cfg: ConfigService) {}

  // ── Slack ─────────────────────────────────────────────────────────────────

  async sendSlack(message: SlackMessage): Promise<boolean> {
    const token = this.cfg.get<string>('SLACK_BOT_TOKEN');
    const webhookUrl = this.cfg.get<string>('SLACK_WEBHOOK_URL');

    if (token) {
      try {
        await axios.post('https://slack.com/api/chat.postMessage', message, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        this.logger.log(`Slack notification sent via Bot Token to ${message.channel}`);
        return true;
      } catch (err) {
        this.logger.error('Failed to send Slack notification via Bot Token', err);
      }
    }

    if (webhookUrl) {
      try {
        await axios.post(webhookUrl, { text: message.text, blocks: message.blocks });
        this.logger.log('Slack notification sent via Webhook URL');
        return true;
      } catch (err) {
        this.logger.error('Failed to send Slack notification via Webhook URL', err);
        return false;
      }
    }

    this.logger.warn('No Slack credentials configured (SLACK_BOT_TOKEN or SLACK_WEBHOOK_URL). Skipping.');
    return false;
  }

  // ── Microsoft Teams ───────────────────────────────────────────────────────

  /**
   * Send an Adaptive Card message to a Teams channel via Incoming Webhook.
   * Configure: TEAMS_WEBHOOK_URL in .env
   */
  async sendTeams(title: string, text: string): Promise<boolean> {
    const webhookUrl = this.cfg.get<string>('TEAMS_WEBHOOK_URL');
    if (!webhookUrl) {
      this.logger.warn('TEAMS_WEBHOOK_URL not configured. Skipping Teams notification.');
      return false;
    }

    const payload = {
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            type: 'AdaptiveCard',
            version: '1.4',
            msteams: { width: 'Full' },
            body: [
              { type: 'TextBlock', text: title, weight: 'Bolder', size: 'Medium', color: 'Accent' },
              { type: 'TextBlock', text, wrap: true, color: 'Default' },
            ],
          },
        },
      ],
    };

    try {
      await axios.post(webhookUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      this.logger.log(`Teams notification sent: ${title}`);
      return true;
    } catch (err) {
      this.logger.error(`Failed to send Teams notification: ${err.message}`);
      return false;
    }
  }

  // ── Jira ──────────────────────────────────────────────────────────────────

  /**
   * Create a Jira issue via the Jira Cloud REST API v3.
   * Configure: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY
   * Returns the created issue key (e.g. "OPS-42") or null on failure.
   */
  async createJiraIssue(params: {
    summary: string;
    description: string;
    issueType?: string;
    priority?: string;
    labels?: string[];
  }): Promise<string | null> {
    const baseUrl = this.cfg.get<string>('JIRA_BASE_URL');
    const email = this.cfg.get<string>('JIRA_EMAIL');
    const apiToken = this.cfg.get<string>('JIRA_API_TOKEN');
    const projectKey = this.cfg.get<string>('JIRA_PROJECT_KEY');

    if (!baseUrl || !email || !apiToken || !projectKey) {
      this.logger.warn('Jira not fully configured (JIRA_BASE_URL / JIRA_EMAIL / JIRA_API_TOKEN / JIRA_PROJECT_KEY). Skipping.');
      return null;
    }

    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

    const body = {
      fields: {
        project: { key: projectKey },
        summary: params.summary,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: params.description }],
            },
          ],
        },
        issuetype: { name: params.issueType ?? 'Bug' },
        priority: { name: params.priority ?? 'High' },
        labels: params.labels ?? ['ai-devops', 'auto-created'],
      },
    };

    try {
      const res = await axios.post(`${baseUrl}/rest/api/3/issue`, body, {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });
      const key: string = res.data.key;
      this.logger.log(`Jira issue created: ${key}`);
      return key;
    } catch (err) {
      this.logger.error(`Failed to create Jira issue: ${err.message}`);
      return null;
    }
  }

  // ── Email ─────────────────────────────────────────────────────────────────

  /**
   * Send an email notification via SMTP (nodemailer).
   * Configure: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
   */
  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    const host = this.cfg.get<string>('SMTP_HOST');
    const port = this.cfg.get<number>('SMTP_PORT') ?? 587;
    const user = this.cfg.get<string>('SMTP_USER');
    const pass = this.cfg.get<string>('SMTP_PASS');
    const from = this.cfg.get<string>('EMAIL_FROM') ?? user ?? 'noreply@aidevops.local';

    if (!host || !user || !pass) {
      this.logger.warn('SMTP not configured (SMTP_HOST / SMTP_USER / SMTP_PASS). Skipping email.');
      return false;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    try {
      await transporter.sendMail({ from, to, subject, html });
      this.logger.log(`Email sent to ${to}: ${subject}`);
      return true;
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${err.message}`);
      return false;
    }
  }

  // ── Composite notification methods ────────────────────────────────────────

  async notifyPipelineResult(params: {
    pipelineRunId: string;
    projectName: string;
    branch: string;
    author: string;
    commitSha: string;
    status: PipelineStatus;
    riskScore?: number;
    duration?: string;
  }): Promise<void> {
    const { status, projectName, branch, author, commitSha, riskScore, pipelineRunId } = params;
    const statusEmoji = { success: '✅', failed: '❌', blocked: '🚫' }[status];
    const channel = this.cfg.get<string>('SLACK_CHANNEL_ID', '#deployments');
    const frontendUrl = this.cfg.get('FRONTEND_URL', 'http://localhost:3000');
    const pipelineUrl = `${frontendUrl}/dashboard/pipelines/${pipelineRunId}`;

    const summaryText =
      `${statusEmoji} Pipeline ${status.toUpperCase()} — ${projectName}\n` +
      `Branch: ${branch} | Author: ${author} | Commit: ${commitSha.slice(0, 7)}` +
      (riskScore !== undefined ? ` | Risk: ${riskScore}/100` : '');

    // Slack
    await this.sendSlack({
      channel,
      text: `${statusEmoji} Pipeline ${status.toUpperCase()} — ${projectName}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${statusEmoji} Pipeline ${status.toUpperCase()}*\n*Project:* ${projectName}\n*Branch:* \`${branch}\`\n*Author:* ${author}\n*Commit:* \`${commitSha.slice(0, 7)}\`${riskScore !== undefined ? `\n*AI Risk Score:* ${riskScore}/100` : ''}`,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'View Pipeline' },
              url: pipelineUrl,
            },
          ],
        },
      ],
    });

    // Teams (G3.5)
    await this.sendTeams(
      `${statusEmoji} Pipeline ${status.toUpperCase()} — ${projectName}`,
      summaryText,
    );
  }

  async notifyAnomalyDetected(params: {
    deploymentId: string;
    anomalyType: string;
    severity: string;
    title: string;
    description: string;
    recommendation: string;
    autoRollback: boolean;
  }): Promise<void> {
    const channel = this.cfg.get<string>('SLACK_CHANNEL_ID', '#alerts');
    const slackBody =
      `*🚨 Production Anomaly Detected*\n*Type:* ${params.anomalyType}\n*Severity:* ${params.severity.toUpperCase()}\n` +
      `*Title:* ${params.title}\n*Description:* ${params.description}\n*Recommendation:* ${params.recommendation}\n` +
      `*Auto-rollback:* ${params.autoRollback ? '✅ Triggered' : '❌ Not triggered'}`;

    await this.sendSlack({
      channel,
      text: `🚨 Production Anomaly: ${params.title}`,
      blocks: [{ type: 'section', text: { type: 'mrkdwn', text: slackBody } }],
    });

    await this.sendTeams(`🚨 Production Anomaly: ${params.title}`, params.description);
  }

  async sendIncidentNotification(incident: any, rca: any, rollback: any): Promise<void> {
    const channel = this.cfg.get<string>('SLACK_CHANNEL_ID', '#alerts');
    const severityEmoji = incident.severity === 'critical' ? '🔥' : '🚨';

    // Slack
    await this.sendSlack({
      channel,
      text: `${severityEmoji} Incident: ${incident.title}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${severityEmoji} New Incident: ${incident.title}*\n*Severity:* ${incident.severity.toUpperCase()}\n*Environment:* ${incident.environment}\n*Source:* ${incident.source}\n*Description:* ${incident.description}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*🧠 AI Root Cause Analysis*\n*Summary:* ${rca.summary}\n*Root Cause:* ${rca.rootCause}\n*Confidence:* ${rca.confidenceScore}%`,
          },
        },
        ...(rollback
          ? [
              {
                type: 'section' as const,
                text: {
                  type: 'mrkdwn',
                  text: `*🔄 Auto-Rollback Triggered*\n*Status:* ${rollback.status}\n*Reason:* ${rollback.reason}`,
                },
              },
            ]
          : []),
      ],
    });

    // Teams (G3.4)
    await this.sendTeams(
      `${severityEmoji} Incident: ${incident.title}`,
      `Severity: ${incident.severity.toUpperCase()}\nEnvironment: ${incident.environment}\nRCA: ${rca.summary}`,
    );

    // Jira (G3.4) — auto-create issues for critical/high incidents
    if (['critical', 'high'].includes(incident.severity)) {
      await this.createJiraIssue({
        summary: `[${incident.severity.toUpperCase()}] Incident: ${incident.title}`,
        description:
          `Environment: ${incident.environment}\nSource: ${incident.source}\n\n` +
          `Description: ${incident.description}\n\nRCA Summary: ${rca.summary}\n` +
          `Root Cause: ${rca.rootCause}\nConfidence: ${rca.confidenceScore}%`,
        issueType: 'Bug',
        priority: incident.severity === 'critical' ? 'Highest' : 'High',
        labels: ['incident', 'ai-devops', incident.environment],
      });
    }
  }
}
