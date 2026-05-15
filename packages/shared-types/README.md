# 📦 `@aidevops/shared-types`

Shared TypeScript type definitions used across all AI DevOps platform apps and packages.

## Usage

```typescript
import type {
  PipelineRun,
  PipelineStage,
  AIReviewResult,
  RiskScore,
  CodeIssue,
  Deployment,
  AnomalyAlert,
  MetricSnapshot,
} from '@aidevops/shared-types';
```

---

## Type Reference

### Pipeline

```typescript
interface PipelineRun {
  id: string;
  projectId: string;
  branch: string;
  commitSha: string;
  commitMessage: string;
  author: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'blocked' | 'cancelled';
  stages: PipelineStage[];
  aiReview?: AIReviewResult;
  triggeredAt: Date;
  completedAt?: Date;
  durationMs?: number;
}

interface PipelineStage {
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  logs?: string;
}
```

### AI Review

```typescript
interface AIReviewResult {
  id: string;
  pipelineRunId: string;
  riskScore: RiskScore;
  issues: CodeIssue[];
  summary: string;
  approved: boolean;
  blockedReason?: string;
  provider: 'openai' | 'anthropic';
  tokensUsed: number;
  costUsd: number;
  reviewedAt: Date;
}

interface RiskScore {
  overall: number;         // 0–100
  security: number;        // 0–100
  quality: number;         // 0–100
  performance: number;     // 0–100
  level: 'critical' | 'high' | 'medium' | 'low' | 'info';
  summary: string;
}

interface CodeIssue {
  file: string;
  line: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'security' | 'quality' | 'performance' | 'logic' | 'style';
  title: string;
  description: string;
  suggestion: string;
}
```

### Deployment

```typescript
interface Deployment {
  id: string;
  pipelineRunId: string;
  projectId: string;
  imageTag: string;
  target: DeploymentTarget;
  status: 'pending' | 'deploying' | 'success' | 'failed' | 'rolled_back';
  strategy: 'rolling' | 'blue_green' | 'canary';
  canaryWeight?: number;    // % of traffic to new version
  startedAt: Date;
  completedAt?: Date;
  rolledBackAt?: Date;
}
```

### Monitoring

```typescript
interface MetricSnapshot {
  service: string;
  timestamp: Date;
  errorRate: number;       // e.g. 0.02 = 2%
  latencyP50: number;      // ms
  latencyP99: number;      // ms
  requestsPerSecond: number;
  cpuPercent: number;
  memoryPercent: number;
  customMetrics?: Record<string, number>;
}

interface AnomalyAlert {
  id: string;
  service: string;
  severity: 'critical' | 'warning';
  metric: string;
  threshold: number;
  current: number;
  rootCause: string;
  recommendation: string;
  autoRollback: boolean;
  detectedAt: Date;
}
```

### WebSocket Events

```typescript
type WsEvent =
  | { event: 'pipeline:stage_update'; data: { pipelineRunId: string; stage: string; status: string } }
  | { event: 'pipeline:complete';     data: { pipelineRunId: string; status: string; durationMs: number } }
  | { event: 'anomaly:detected';      data: AnomalyAlert }
  | { event: 'review:complete';       data: { reviewId: string; riskScore: RiskScore; approved: boolean } };
```

---

## Building

```bash
powershell -ExecutionPolicy Bypass -Command "pnpm --filter @aidevops/shared-types build"
```
