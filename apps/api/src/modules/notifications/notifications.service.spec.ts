import { NotificationsService } from './notifications.service';
import { ConfigService } from '@nestjs/config';

// Mock axios globally
jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn(),
}));

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  }),
}));

import axios from 'axios';
import * as nodemailer from 'nodemailer';

const makeConfigService = (overrides: Record<string, string | number | undefined> = {}) => {
  const values: Record<string, string | number | undefined> = {
    SLACK_BOT_TOKEN: undefined,
    SLACK_WEBHOOK_URL: undefined,
    SLACK_CHANNEL_ID: '#test',
    TEAMS_WEBHOOK_URL: undefined,
    JIRA_BASE_URL: undefined,
    JIRA_EMAIL: undefined,
    JIRA_API_TOKEN: undefined,
    JIRA_PROJECT_KEY: undefined,
    SMTP_HOST: undefined,
    SMTP_USER: undefined,
    SMTP_PASS: undefined,
    SMTP_PORT: 587,
    FRONTEND_URL: 'http://localhost:3000',
    ...overrides,
  };
  return {
    get: jest.fn((key: string, defaultVal?: any) => values[key] ?? defaultVal),
  } as unknown as ConfigService;
};

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Slack ──────────────────────────────────────────────────────────────────

  describe('sendSlack', () => {
    it('sends via bot token when SLACK_BOT_TOKEN is set', async () => {
      service = new NotificationsService(makeConfigService({ SLACK_BOT_TOKEN: 'xoxb-test' }));
      (axios.post as jest.Mock).mockResolvedValue({ data: { ok: true } });

      const result = await service.sendSlack({ text: 'Hello' });

      expect(axios.post).toHaveBeenCalledWith(
        'https://slack.com/api/chat.postMessage',
        expect.any(Object),
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer xoxb-test' }) }),
      );
      expect(result).toBe(true);
    });

    it('falls back to webhook URL when bot token is absent', async () => {
      service = new NotificationsService(
        makeConfigService({ SLACK_WEBHOOK_URL: 'https://hooks.slack.com/test' }),
      );
      (axios.post as jest.Mock).mockResolvedValue({});

      const result = await service.sendSlack({ text: 'Hello' });

      expect(axios.post).toHaveBeenCalledWith(
        'https://hooks.slack.com/test',
        expect.any(Object),
      );
      expect(result).toBe(true);
    });

    it('returns false and skips gracefully when no credentials are configured', async () => {
      service = new NotificationsService(makeConfigService());
      const result = await service.sendSlack({ text: 'Hello' });
      expect(result).toBe(false);
      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  // ── Teams ──────────────────────────────────────────────────────────────────

  describe('sendTeams', () => {
    it('posts an Adaptive Card when TEAMS_WEBHOOK_URL is set', async () => {
      service = new NotificationsService(
        makeConfigService({ TEAMS_WEBHOOK_URL: 'https://outlook.office.com/webhook/test' }),
      );
      (axios.post as jest.Mock).mockResolvedValue({});

      const result = await service.sendTeams('Test Title', 'Test body');

      expect(axios.post).toHaveBeenCalledWith(
        'https://outlook.office.com/webhook/test',
        expect.objectContaining({ type: 'message' }),
        expect.any(Object),
      );
      expect(result).toBe(true);
    });

    it('returns false and skips gracefully when TEAMS_WEBHOOK_URL is not set', async () => {
      service = new NotificationsService(makeConfigService());
      const result = await service.sendTeams('Title', 'Body');
      expect(result).toBe(false);
      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  // ── Jira ───────────────────────────────────────────────────────────────────

  describe('createJiraIssue', () => {
    it('creates a Jira issue and returns the issue key', async () => {
      service = new NotificationsService(
        makeConfigService({
          JIRA_BASE_URL: 'https://test.atlassian.net',
          JIRA_EMAIL: 'user@test.com',
          JIRA_API_TOKEN: 'test-token',
          JIRA_PROJECT_KEY: 'OPS',
        }),
      );
      (axios.post as jest.Mock).mockResolvedValue({ data: { key: 'OPS-42' } });

      const key = await service.createJiraIssue({ summary: 'Incident', description: 'Details' });

      expect(key).toBe('OPS-42');
      expect(axios.post).toHaveBeenCalledWith(
        'https://test.atlassian.net/rest/api/3/issue',
        expect.objectContaining({ fields: expect.objectContaining({ project: { key: 'OPS' } }) }),
        expect.any(Object),
      );
    });

    it('returns null when Jira is not configured', async () => {
      service = new NotificationsService(makeConfigService());
      const key = await service.createJiraIssue({ summary: 'Test', description: 'Test' });
      expect(key).toBeNull();
      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  // ── Email ──────────────────────────────────────────────────────────────────

  describe('sendEmail', () => {
    it('sends an email via nodemailer when SMTP is configured', async () => {
      service = new NotificationsService(
        makeConfigService({
          SMTP_HOST: 'smtp.test.com',
          SMTP_USER: 'user@test.com',
          SMTP_PASS: 'pass',
          SMTP_PORT: 587,
        }),
      );

      const result = await service.sendEmail('to@test.com', 'Subject', '<p>Body</p>');

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({ host: 'smtp.test.com' }),
      );
      expect(result).toBe(true);
    });

    it('returns false when SMTP is not configured', async () => {
      service = new NotificationsService(makeConfigService());
      const result = await service.sendEmail('to@test.com', 'Subject', '<p>Body</p>');
      expect(result).toBe(false);
    });
  });
});
