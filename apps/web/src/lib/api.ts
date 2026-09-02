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

export interface Deployment {
  id: string;
  pipelineRunId: string;
  target: { environment: string; namespace?: string; cluster?: string };
  imageTag: string;
  previousImageTag?: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'rolled_back';
  strategy: 'rolling' | 'blue_green' | 'canary';
  canaryWeight?: number;
  startedAt: string;
  completedAt?: string;
  rolledBackAt?: string;
  rollbackReason?: string;
}

export interface DeploymentStats {
  total: number;
  succeeded: number;
  failed: number;
  rolledBack: number;
  byStrategy: { rolling: number; blue_green: number; canary: number };
}

export interface Incident {
  id: string;
  projectId: string;
  deploymentId?: string;
  environment: string;
  source: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  metric?: string;
  value?: number;
  threshold?: number;
  timestamp: string;
  status?: 'open' | 'investigating' | 'resolved';
  resolvedAt?: string;
  projectName?: string;
  deploymentImageTag?: string;
  commitSha?: string;
  branch?: string;
  approvedBy?: string;
  riskScore?: number;
}

export interface RootCauseAnalysis {
  id: string;
  incidentId: string;
  summary: string;
  hypothesis: string;
  rootCause: string;
  affectedComponents: string[];
  recommendedActions: string[];
  confidenceScore: number;
  generatedAt: string;
}

export interface AnomalyAlert {
  id: string;
  deploymentId: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  metric: string;
  currentValue: number;
  expectedRange: { min: number; max: number };
  confidence: number;
  recommendation: string;
  autoRollbackTriggered: boolean;
  detectedAt: string;
}

export interface IncidentStats {
  total: number;
  active: number;
  resolved: number;
  avgMttr: string;
  rcaGenerated: number;
  autoRollbacks: number;
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  repoUrl: string;
  repoProvider: 'github' | 'gitlab';
  defaultBranch: string;
  riskThreshold: number;
  syncStatus?: 'pending' | 'syncing' | 'completed' | 'failed';
  lastSyncedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  githubInstallationId?: number;
  createdAt: string;
}

export interface Policy {
  id: string;
  organizationId: string;
  projectId?: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;
  action: 'approved' | 'blocked' | 'needs_review';
  rules: Array<{
    field: string;
    operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
    value: number;
  }>;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId: string;
  details?: string;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: 'owner' | 'admin' | 'devops_engineer' | 'sre_engineer' | 'security_engineer' | 'developer' | 'viewer';
  createdAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  organizationId: string;
  role: 'owner' | 'admin' | 'devops_engineer' | 'sre_engineer' | 'security_engineer' | 'developer' | 'viewer';
  token: string;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'expired';
  createdAt: string;
  expiresAt?: string;
}

export interface ApprovalRequest {
  id: string;
  pipelineRunId: string;
  projectId: string;
  requestedBy: string;
  reviewedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  createdAt: string;
  reviewedAt?: string;
}

export interface DoraMetrics {
  deploymentFrequency: { daily: number; weekly: number; label: string };
  leadTime: { avgHours: number; label: string };
  changeFailureRate: { percentage: number; label: string };
  mttr: { avgMinutes: number; label: string };
  trend: Array<{ date: string; deployments: number; failures: number; mttr: number }>;
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

// ─── Organizations endpoints ──────────────────────────────────────────────────

export const getOrganization = (id: string) =>
  apiFetch<Organization>(`/organizations/${id}`);

export const createOrganization = (data: { name: string; slug: string }) =>
  apiFetch<Organization>('/organizations', { method: 'POST', body: JSON.stringify(data) });

export const updateOrganization = (id: string, data: Partial<Organization>) =>
  apiFetch<Organization>(`/organizations/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const completeOnboarding = () =>
  apiFetch<{ success: boolean }>('/organizations/complete-onboarding', { method: 'POST' });

export const getPipelineStats = (organizationId: string) =>
  apiFetch<PipelineStats>(`/pipelines/stats?organizationId=${organizationId}`);

export const getPipelineById = (id: string) =>
  apiFetch<PipelineRun>(`/pipelines/${id}`);

export const triggerPipeline = (data: {
  projectId?: string;
  organizationId?: string;
  branch?: string;
  author?: string;
  message?: string;
  diff?: string;
}) =>
  apiFetch<PipelineRun>('/pipelines/trigger', {
    method: 'POST',
    body: JSON.stringify(data),
  });



// ─── AI Review endpoints ──────────────────────────────────────────────────────

export const getAIReviewStats = () =>
  apiFetch<AIReviewStats>('/ai-reviews/stats');

export const getAIReviews = (limit = 20) =>
  apiFetch<AIReviewResult[]>(`/ai-reviews?limit=${limit}`);

export const getAIReviewByPipeline = (pipelineRunId: string) =>
  apiFetch<AIReviewResult>(`/ai-reviews/pipeline/${pipelineRunId}`);

// ─── Deployment endpoints ─────────────────────────────────────────────────────

export const getDeployments = (limit = 20) =>
  apiFetch<Deployment[]>(`/deployments?limit=${limit}`);

export const getDeploymentById = (id: string) =>
  apiFetch<Deployment>(`/deployments/${id}`);

export const getDeploymentStats = () =>
  apiFetch<DeploymentStats>('/deployments/stats');

export const rollbackDeployment = (id: string, reason: string) =>
  apiFetch<Deployment>(`/deployments/${id}/rollback`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });

// ─── Monitoring / Incidents endpoints ────────────────────────────────────────

export const getIncidents = (projectId?: string) => {
  const params = projectId ? `?projectId=${projectId}` : '';
  return apiFetch<Incident[]>(`/monitoring/incidents${params}`);
};

export const getIncidentStats = () =>
  apiFetch<IncidentStats>('/monitoring/incidents/stats');

export const getIncidentRCA = (incidentId: string) =>
  apiFetch<RootCauseAnalysis>(`/monitoring/incidents/${incidentId}/rca`);

export interface IncidentTimelineEvent {
  id: string;
  incidentId: string;
  title: string;
  description: string;
  type: string;
  timestamp: string;
}

export const getIncidentTimeline = (incidentId: string) =>
  apiFetch<IncidentTimelineEvent[]>(`/monitoring/incidents/${incidentId}/timeline`);

export const updateIncidentStatus = (incidentId: string, status: string) =>
  apiFetch<Incident>(`/monitoring/incidents/${incidentId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });

export const getAnomalies = (deploymentId?: string, limit = 20) => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (deploymentId) params.set('deploymentId', deploymentId);
  return apiFetch<AnomalyAlert[]>(`/monitoring/anomalies?${params}`);
};

export const getActiveAlerts = () =>
  apiFetch<AnomalyAlert[]>('/monitoring/alerts/active');


// ─── Projects endpoints ───────────────────────────────────────────────────────

export const getProjects = (organizationId: string) =>
  apiFetch<Project[]>(`/projects?organizationId=${organizationId}`);

export const getProjectById = (id: string) =>
  apiFetch<Project>(`/projects/${id}`);

export const getProjectSyncStatus = (id: string) =>
  apiFetch<{ status: string; lastSyncedAt: string | null }>(`/projects/${id}/sync-status`);

export const createProject = (data: Partial<Project>) =>
  apiFetch<Project>('/projects', { method: 'POST', body: JSON.stringify(data) });

export const updateProject = (id: string, data: Partial<Project>) =>
  apiFetch<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export interface Commit {
  id: string;
  sha: string;
  branch: string;
  author: string;
  message: string;
  riskScore?: number;
  riskLevel?: string;
  analysisSummary?: string;
  createdAt: string;
}

export interface PullRequest {
  id: string;
  number: number;
  title: string;
  state: string;
  author: string;
  url: string;
  riskScore?: number;
  riskLevel?: string;
  analysisSummary?: string;
  createdAt: string;
  updatedAt: string;
  mergedAt?: string | null;
}

export const getProjectCommits = (projectId: string) =>
  apiFetch<Commit[]>(`/projects/${projectId}/commits`);

export const getProjectPullRequests = (projectId: string) =>
  apiFetch<PullRequest[]>(`/projects/${projectId}/pull-requests`);

export interface GitHubRepo {
  fullName: string;
  name: string;
  description: string;
  defaultBranch: string;
  private: boolean;
  language: string;
  stars: number;
  updatedAt: string;
}

export const listGitHubRepos = () =>
  apiFetch<GitHubRepo[]>('/projects/github/repos');

export const listUserGitHubRepos = () =>
  apiFetch<GitHubRepo[]>('/projects/github/user-repos');

export const connectGitHubRepo = (data: {
  organizationId: string;
  repoFullName: string;
  name: string;
  defaultBranch?: string;
}) =>
  apiFetch<Project>('/projects/connect-github', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const listGitHubAppRepos = (installationId: number) =>
  apiFetch<GitHubRepo[]>(`/projects/github/installations/${installationId}/repos`);

export const connectGitHubAppRepo = (data: {
  organizationId: string;
  installationId: number;
  repoFullName: string;
  name: string;
  defaultBranch?: string;
}) =>
  apiFetch<Project>('/projects/github/connect-app-repo', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// ─── Policies endpoints ───────────────────────────────────────────────────────

export const getPolicies = (organizationId: string) =>
  apiFetch<Policy[]>(`/policies?organizationId=${organizationId}`);

export const createPolicy = (data: Partial<Policy>) =>
  apiFetch<Policy>('/policies', { method: 'POST', body: JSON.stringify(data) });

export const updatePolicy = (id: string, data: Partial<Policy>) =>
  apiFetch<Policy>(`/policies/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deletePolicy = (id: string) =>
  apiFetch<void>(`/policies/${id}`, { method: 'DELETE' });

export const togglePolicy = (id: string) =>
  apiFetch<Policy>(`/policies/${id}/toggle`, { method: 'PATCH' });

// ─── Governance endpoints ─────────────────────────────────────────────────────

export const getAuditLogs = (organizationId: string, limit = 50) =>
  apiFetch<AuditLog[]>(`/governance/audit-logs?organizationId=${organizationId}&limit=${limit}`);

export const getTeamMembers = (organizationId: string) =>
  apiFetch<TeamMember[]>(`/governance/members?organizationId=${organizationId}`);

export const updateMemberRole = (memberId: string, role: TeamMember['role']) =>
  apiFetch<TeamMember>(`/governance/members/${memberId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });

export const getApprovalRequests = (organizationId: string) =>
  apiFetch<ApprovalRequest[]>(`/governance/approval-requests?organizationId=${organizationId}`);

export const approveRequest = (id: string, reason?: string) =>
  apiFetch<ApprovalRequest>(`/governance/approval-requests/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });

export const rejectRequest = (id: string, reason: string) =>
  apiFetch<ApprovalRequest>(`/governance/approval-requests/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });

// ─── Analytics endpoints ──────────────────────────────────────────────────────

export const getDoraMetrics = (organizationId: string, days = 30, projectId?: string) => {
  const params = new URLSearchParams({ organizationId, days: String(days) });
  if (projectId) params.set('projectId', projectId);
  return apiFetch<DoraMetrics>(`/analytics/dora?${params}`);
};

export const getPendingInvitations = (organizationId: string) =>
  apiFetch<Invitation[]>(`/organizations/${organizationId}/invitations`);

export const inviteTeamMember = (organizationId: string, data: { email: string; role: string }) =>
  apiFetch<Invitation>(`/organizations/${organizationId}/invitations`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const cancelInvitation = (organizationId: string, invitationId: string) =>
  apiFetch<{ success: boolean }>(`/organizations/${organizationId}/invitations/${invitationId}`, {
    method: 'DELETE',
  });

// ─── Health check ─────────────────────────────────────────────────────────────

export const getHealth = () =>
  apiFetch<{ status: string; timestamp: string }>('/health');
