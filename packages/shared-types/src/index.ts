// ─── Pipeline Types ───────────────────────────────────────────────────────────

export type StageStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped' | 'blocked';

export type PipelineStageName =
  | 'code_push'
  | 'ai_review'
  | 'static_analysis'
  | 'security_scan'
  | 'unit_tests'
  | 'integration_tests'
  | 'build'
  | 'containerize'
  | 'push_artifact'
  | 'deploy'
  | 'canary_release'
  | 'monitoring'
  | 'notify';

export interface PipelineStage {
  id: string;
  name: PipelineStageName;
  status: StageStatus;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  logs?: string[];
  metadata?: Record<string, unknown>;
}

export interface PipelineRun {
  id: string;
  projectId: string;
  organizationId: string;
  commitSha: string;
  branch: string;
  author: string;
  message: string;
  prNumber?: number;
  prUrl?: string;
  status: StageStatus;
  stages: PipelineStage[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  triggeredBy: 'push' | 'pull_request' | 'manual' | 'schedule';
}

// ─── AI Review Types ──────────────────────────────────────────────────────────

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface CodeIssue {
  id: string;
  file: string;
  line: number;
  endLine?: number;
  column?: number;
  riskLevel: RiskLevel;
  category: 'security' | 'performance' | 'quality' | 'maintainability' | 'logic';
  title: string;
  description: string;
  suggestion: string;
  codeSnippet?: string;
  fixExample?: string;
}

export interface RiskScore {
  overall: number; // 0-100, higher = riskier
  security: number;
  quality: number;
  performance: number;
  maintainability: number;
  level: RiskLevel;
  summary: string;
}

export interface AIReviewResult {
  id: string;
  pipelineRunId: string;
  provider: 'openai' | 'anthropic';
  model: string;
  riskScore: RiskScore;
  issues: CodeIssue[];
  summary: string;
  recommendations: string[];
  approved: boolean;
  blockedReason?: string;
  tokensUsed: number;
  costUsd: number;
  createdAt: string;
}

// ─── Security Scan Types ──────────────────────────────────────────────────────

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'unknown';

export interface SecurityFinding {
  id: string;
  tool: 'semgrep' | 'trivy' | 'snyk' | 'sonarcloud' | 'eslint';
  severity: SeverityLevel;
  ruleId: string;
  title: string;
  description: string;
  file?: string;
  line?: number;
  cve?: string;
  cvss?: number;
  fixAvailable: boolean;
  fixDescription?: string;
}

export interface SecurityScanResult {
  id: string;
  pipelineRunId: string;
  tool: string;
  findings: SecurityFinding[];
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  passed: boolean;
  scannedAt: string;
}

// ─── Build & Deployment Types ─────────────────────────────────────────────────

export interface DockerBuild {
  id: string;
  pipelineRunId: string;
  imageName: string;
  imageTag: string;
  registry: string;
  digest?: string;
  sizeMb?: number;
  buildDurationMs?: number;
  status: StageStatus;
  logs?: string[];
  createdAt: string;
}

export type DeploymentStrategy = 'rolling' | 'blue_green' | 'canary' | 'recreate';

export interface CanaryConfig {
  enabled: boolean;
  initialWeight: number; // percentage (0-100)
  targetWeight: number;
  stepSize: number;
  stepIntervalMinutes: number;
  metricsThreshold: {
    errorRateMax: number;
    latencyP99MaxMs: number;
  };
}

export interface DeploymentTarget {
  id: string;
  name: string;
  environment: 'development' | 'staging' | 'production';
  type: 'docker_compose' | 'kubernetes' | 'ecs' | 'cloud_run';
  host?: string;
  namespace?: string;
  strategy: DeploymentStrategy;
  canaryConfig?: CanaryConfig;
}

export interface Deployment {
  id: string;
  pipelineRunId: string;
  target: DeploymentTarget;
  imageTag: string;
  status: StageStatus;
  strategy: DeploymentStrategy;
  previousImageTag?: string;
  canaryWeight?: number;
  startedAt: string;
  completedAt?: string;
  rolledBackAt?: string;
  rollbackReason?: string;
}

// ─── Monitoring & Anomaly Types ───────────────────────────────────────────────

export interface MetricSnapshot {
  timestamp: string;
  service: string;
  environment: string;
  errorRate: number;       // percentage
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencyP99Ms: number;
  requestsPerSecond: number;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  podRestarts?: number;
}

export type AnomalyType =
  | 'error_rate_spike'
  | 'latency_spike'
  | 'memory_leak'
  | 'cpu_spike'
  | 'pod_crash_loop'
  | 'traffic_drop'
  | 'custom';

export interface AnomalyAlert {
  id: string;
  deploymentId: string;
  type: AnomalyType;
  severity: SeverityLevel;
  title: string;
  description: string;
  metric: string;
  currentValue: number;
  expectedRange: { min: number; max: number };
  confidence: number; // 0-1
  recommendation: string;
  autoRollbackTriggered: boolean;
  detectedAt: string;
}

// ─── User & Organization Types ────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  organizationId: string;
  role: 'admin' | 'developer' | 'viewer';
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: string;
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  repoUrl: string;
  repoProvider: 'github' | 'gitlab' | 'bitbucket';
  defaultBranch: string;
  deploymentTargets: DeploymentTarget[];
  riskThreshold: number; // block pipeline if AI risk score > this
  createdAt: string;
  updatedAt: string;
}

// ─── Notification Types ───────────────────────────────────────────────────────

export type NotificationChannel = 'slack' | 'teams' | 'jira' | 'email' | 'webhook';
export type NotificationEvent =
  | 'pipeline_started'
  | 'pipeline_success'
  | 'pipeline_failed'
  | 'ai_review_complete'
  | 'deployment_success'
  | 'deployment_failed'
  | 'anomaly_detected'
  | 'rollback_triggered';

export interface NotificationConfig {
  id: string;
  projectId: string;
  channel: NotificationChannel;
  events: NotificationEvent[];
  webhookUrl?: string;
  slackChannelId?: string;
  jiraProjectKey?: string;
  enabled: boolean;
}

// ─── WebSocket Events ─────────────────────────────────────────────────────────

export interface WsEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: string;
}

export interface PipelineStageUpdateEvent {
  pipelineRunId: string;
  stageId: string;
  stageName: PipelineStageName;
  status: StageStatus;
  log?: string;
}

export interface AnomalyDetectedEvent {
  anomaly: AnomalyAlert;
  deployment: Deployment;
}

// ─── Policy Engine Types ──────────────────────────────────────────────────────

export interface PolicyRule {
  id: string;
  field: 'overall_risk' | 'security_risk' | 'quality_risk' | 'critical_issues' | 'high_issues';
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
}

export type PolicyDecision = 'approved' | 'blocked' | 'needs_review';

export interface PipelinePolicy {
  id: string;
  organizationId: string;
  projectId?: string; // Optional: applies to all projects if undefined
  name: string;
  description: string;
  rules: PolicyRule[];
  action: PolicyDecision; // What to do if rules match
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Incident Intelligence & Observability Types ───────────────────────────────

export interface IncidentAlert {
  id: string;
  projectId: string;
  deploymentId?: string;
  environment: string;
  source: 'datadog' | 'prometheus' | 'aws_cloudwatch' | 'custom';
  severity: SeverityLevel;
  title: string;
  description: string;
  metric?: string;
  value?: number;
  threshold?: number;
  timestamp: string;
}

export interface RootCauseAnalysis {
  id: string;
  incidentId: string;
  summary: string;
  hypothesis: string;
  rootCause: string;
  affectedComponents: string[];
  recommendedActions: string[];
  confidenceScore: number; // 0-100
  generatedAt: string;
}

export interface RollbackEvent {
  id: string;
  incidentId: string;
  deploymentId: string;
  previousDeploymentId: string;
  status: StageStatus;
  reason: string;
  triggeredBy: 'auto' | 'manual';
  triggeredAt: string;
  completedAt?: string;
}
