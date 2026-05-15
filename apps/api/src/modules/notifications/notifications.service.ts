import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

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

  async sendSlack(message: SlackMessage): Promise<boolean> {
    const token = this.cfg.get<string>('SLACK_BOT_TOKEN');
    if (!token) {
      this.logger.warn('SLACK_BOT_TOKEN not configured, skipping Slack notification');
      return false;
    }

    try {
      await axios.post('https://slack.com/api/chat.postMessage', message, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      this.logger.log(`Slack notification sent to ${message.channel}`);
      return true;
    } catch (err) {
      this.logger.error('Failed to send Slack notification', err);
      return false;
    }
  }

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
    const color = { success: '#2ecc71', failed: '#e74c3c', blocked: '#f39c12' }[status];

    const channel = this.cfg.get<string>('SLACK_CHANNEL_ID', '#deployments');

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
              url: `${this.cfg.get('FRONTEND_URL', 'http://localhost:3000')}/pipelines/${pipelineRunId}`,
            },
          ],
        },
      ],
    });
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
    await this.sendSlack({
      channel,
      text: `🚨 Production Anomaly: ${params.title}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*🚨 Production Anomaly Detected*\n*Type:* ${params.anomalyType}\n*Severity:* ${params.severity.toUpperCase()}\n*Title:* ${params.title}\n*Description:* ${params.description}\n*Recommendation:* ${params.recommendation}\n*Auto-rollback:* ${params.autoRollback ? '✅ Triggered' : '❌ Not triggered'}`,
          },
        },
      ],
    });
  }
}
