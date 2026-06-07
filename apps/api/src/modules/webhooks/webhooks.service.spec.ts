import { WebhooksService } from './webhooks.service';

// Mock dependencies
const mockEventRepo = { create: jest.fn().mockImplementation(x => x), save: jest.fn() };
const mockCommitRepo = { save: jest.fn() };
const mockPrRepo = { findOne: jest.fn(), save: jest.fn().mockImplementation(x => x) };
const mockPipelinesService = { create: jest.fn() };
const mockConfigService = { get: jest.fn().mockReturnValue(undefined) };
const mockAIReviewService = {
  summarizePR: jest.fn().mockResolvedValue({ summary: 'PR Summary' }),
  reviewDiff: jest.fn().mockResolvedValue({
    riskScore: { overall: 25, level: 'low', summary: 'Summary' },
  }),
};

describe('WebhooksService', () => {
  let service: WebhooksService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WebhooksService(
      mockEventRepo as any,
      mockCommitRepo as any,
      mockPrRepo as any,
      mockPipelinesService as any,
      mockConfigService as any,
      mockAIReviewService as any,
    );
  });

  // ── GitHub signature ───────────────────────────────────────────────────────

  describe('verifyGitHubSignature', () => {
    it('returns true for a valid HMAC-SHA256 signature', () => {
      const secret = 'my-webhook-secret';
      const payload = JSON.stringify({ ref: 'refs/heads/main' });
      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha256', secret);
      const signature = 'sha256=' + hmac.update(payload).digest('hex');

      expect(service.verifyGitHubSignature(payload, signature, secret)).toBe(true);
    });

    it('returns false for a tampered signature', () => {
      const payload = JSON.stringify({ ref: 'refs/heads/main' });
      expect(service.verifyGitHubSignature(payload, 'sha256=invalid', 'my-webhook-secret')).toBe(false);
    });
  });

  // ── GitLab token ───────────────────────────────────────────────────────────

  describe('verifyGitLabToken', () => {
    it('returns true when tokens match', () => {
      expect(service.verifyGitLabToken('my-secret-token', 'my-secret-token')).toBe(true);
    });

    it('returns false when tokens differ', () => {
      expect(service.verifyGitLabToken('wrong-token', 'my-secret-token')).toBe(false);
    });

    it('returns false when either argument is empty', () => {
      expect(service.verifyGitLabToken('', 'secret')).toBe(false);
      expect(service.verifyGitLabToken('token', '')).toBe(false);
    });

    it('returns false for tokens of different lengths (no timing attack)', () => {
      expect(service.verifyGitLabToken('short', 'much-longer-secret')).toBe(false);
    });
  });

  // ── GitHub push event ──────────────────────────────────────────────────────

  describe('handlePushEvent', () => {
    const payload = {
      ref: 'refs/heads/feature/test',
      after: 'abc123def456',
      pusher: { name: 'developer' },
      repository: { full_name: 'org/repo' },
      commits: [{ id: 'abc123', message: 'feat: add feature', modified: ['src/app.ts'], added: [] }],
    };

    it('calls pipelinesService.create with normalized data', async () => {
      mockPipelinesService.create.mockResolvedValue({ id: 'run-1' });

      await service.handlePushEvent(payload as any, 'project-1', 'org-1');

      expect(mockPipelinesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'project-1',
          organizationId: 'org-1',
          commitSha: 'abc123def456',
          branch: 'feature/test',
          author: 'developer',
          triggeredBy: 'push',
        }),
      );
    });

    it('strips refs/heads/ prefix from branch name', async () => {
      mockPipelinesService.create.mockResolvedValue({ id: 'run-2' });

      await service.handlePushEvent(payload as any, 'p', 'o');

      const call = mockPipelinesService.create.mock.calls[0][0];
      expect(call.branch).toBe('feature/test');
    });
  });

  // ── GitLab push event ──────────────────────────────────────────────────────

  describe('handleGitLabPushEvent', () => {
    const glPayload = {
      ref: 'refs/heads/main',
      after: 'deadbeef1234',
      checkout_sha: 'deadbeef1234',
      user_name: 'gitlab-dev',
      repository: { name: 'my-repo', homepage: 'https://gitlab.com/org/my-repo' },
      commits: [{ id: 'deadbeef', message: 'chore: update deps', modified: ['package.json'], added: [] }],
    };

    it('calls pipelinesService.create with GitLab-normalized data', async () => {
      mockPipelinesService.create.mockResolvedValue({ id: 'run-gl-1' });

      await service.handleGitLabPushEvent(glPayload as any, 'project-gl', 'org-gl');

      expect(mockPipelinesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'project-gl',
          organizationId: 'org-gl',
          commitSha: 'deadbeef1234',
          branch: 'main',
          author: 'gitlab-dev',
          triggeredBy: 'push',
        }),
      );
    });
  });

  // ── GitLab MR event ────────────────────────────────────────────────────────

  describe('handleGitLabMREvent', () => {
    const mrPayload = {
      user: { username: 'mr-author' },
      object_attributes: {
        iid: 42,
        title: 'Add new feature',
        action: 'open',
        source_branch: 'feature/new',
        target_branch: 'main',
        url: 'https://gitlab.com/org/repo/-/merge_requests/42',
        last_commit: { id: 'ff00ff00' },
      },
    };

    it('creates a pipeline run for open MR events', async () => {
      mockPipelinesService.create.mockResolvedValue({ id: 'run-mr-1' });

      await service.handleGitLabMREvent(mrPayload as any, 'p', 'o');

      expect(mockPipelinesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          branch: 'feature/new',
          author: 'mr-author',
          prNumber: 42,
          triggeredBy: 'pull_request',
        }),
      );
    });

    it('returns null for non-actionable MR states (e.g. closed)', async () => {
      const closedPayload = { ...mrPayload, object_attributes: { ...mrPayload.object_attributes, action: 'close' } };
      const result = await service.handleGitLabMREvent(closedPayload as any, 'p', 'o');
      expect(result).toBeNull();
      expect(mockPipelinesService.create).not.toHaveBeenCalled();
    });
  });
});
