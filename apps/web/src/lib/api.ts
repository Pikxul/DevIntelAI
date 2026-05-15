/**
 * Typed API client for the NestJS backend.
 * Automatically attaches the NextAuth session token to every request.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PipelineRun {
  id: string;
  projectId: string;
  organizationId: string;
  commitSha: string;
  branch: string;
  author: string;
  message?: string;
  status: 'running' | 'success' | 'failed' | 'blocked' | 'pending';
  triggeredBy: 'push' | 'pull_request' | 'manual' | 'schedule';
  stages: PipelineStage[];
  createdAt: string;
  completedAt?: string;
  prNumber?: number;
  prUrl?: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped' | 'blocked';
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  logs?: string[];
}

export interface PipelineStats {
  total: number;
  succeeded: number;
  failed: number;
  running: number;
  successRate: number;
}

export interface AIReviewStats {
  total: number;
  approved: number;
  blocked: number;
  avgRiskScore: number;
  totalCostUsd: string;
}

export interface AIReviewResult {
  id: string;
  pipelineRunId: string;
  provider: string;
  model: string;
  riskScore: { overall: number; security: number; quality: number; complexity: number };
  issues: Array<{ severity: string; category: string; description: string; file?: string; line?: number }>;
  summary: string;
  recommendations: string[];
  approved: boolean;
  blockedReason?: string;
  tokensUsed: number;
  costUsd: number;
  createdAt: string;
}

// ─── Auth token helper ────────────────────────────────────────────────────────

export async function getToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/token');
    if (!res.ok) return null;
    const { token } = await res.json();
    return token || null;
  } catch {
    return null;
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`API ${path} failed (${res.status}): ${error}`);
  }

  return res.json() as Promise<T>;
}

// ─── Pipeline endpoints ───────────────────────────────────────────────────────

export const getPipelines = (organizationId: string, projectId?: string) => {
  const params = new URLSearchParams({ organizationId });
  if (projectId) params.set('projectId', projectId);
  return apiFetch<PipelineRun[]>(`/pipelines?${params}`);
};

export const getPipelineStats = (organizationId: string) =>
  apiFetch<PipelineStats>(`/pipelines/stats?organizationId=${organizationId}`);

export const getPipelineById = (id: string) =>
  apiFetch<PipelineRun>(`/pipelines/${id}`);

// ─── AI Review endpoints ──────────────────────────────────────────────────────

export const getAIReviewStats = () =>
  apiFetch<AIReviewStats>('/ai-reviews/stats');

export const getAIReviews = (limit = 20) =>
  apiFetch<AIReviewResult[]>(`/ai-reviews?limit=${limit}`);

// ─── Health check ─────────────────────────────────────────────────────────────

export const getHealth = () =>
  apiFetch<{ status: string; timestamp: string }>('/health');
