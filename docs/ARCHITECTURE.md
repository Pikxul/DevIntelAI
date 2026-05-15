# System Architecture

Deep-dive into the AI DevOps Platform's technical architecture.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        DEVELOPER SIDE                           │
│                                                                 │
│  ┌──────────────┐    git push     ┌──────────────────────────┐  │
│  │  VS Code     │ ──────────────► │   GitHub Repository      │  │
│  │  Extension   │                 └──────────┬───────────────┘  │
│  │  (TypeScript)│                            │ webhook           │
│  └──────────────┘                            ▼                  │
└─────────────────────────────────────────────────────────────────┘
                                               │
┌─────────────────────────────────────────────────────────────────┐
│                     PLATFORM BACKEND                            │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐     │
│  │                  NestJS API (port 3001)                │     │
│  │                                                        │     │
│  │  WebhooksModule ──► PipelinesModule                    │     │
│  │                          │                             │     │
│  │                    BullMQ Queue                        │     │
│  │                          │                             │     │
│  │            ┌─────────────┼─────────────┐              │     │
│  │            ▼             ▼             ▼              │     │
│  │     AIReviewModule  BuildsModule  DeployModule         │     │
│  │            │             │             │              │     │
│  │            └─────────────┼─────────────┘              │     │
│  │                          ▼                             │     │
│  │                 MonitoringModule                       │     │
│  │                 NotificationsModule                    │     │
│  │                 GatewayModule (Socket.io)              │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │  PostgreSQL  │    │    Redis     │    │  AI Providers    │   │
│  │  (TypeORM)   │    │  (BullMQ)    │    │  GPT-4o + Claude │   │
│  └──────────────┘    └──────────────┘    └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                    WebSocket events │ REST API
                                │
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND SaaS                              │
│                                                                 │
│               Next.js 14 Dashboard (port 3000)                  │
│  Overview · Pipelines · AI Review · Deployments · Monitoring    │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                     OBSERVABILITY                               │
│                                                                 │
│  Prometheus (9090) → Grafana (3030)                             │
│  API exposes /api/v1/metrics (Prometheus format)                │
└─────────────────────────────────────────────────────────────────┘
```

---

## AI Review Pipeline

```
git push / pull_request
        │
        ▼
WebhooksController.handlePushEvent()
  - Verify HMAC signature
  - Extract: branch, commitSha, author, diff
        │
        ▼
PipelinesService.createRun()
  - Create PipelineRun record (status: running)
  - Emit socket event: pipeline:stage_update
        │
        ▼ (BullMQ job enqueue)
AIReviewProcessor.process()
        │
        ├─ AIClient.reviewCode(diff)
        │       ├─ OpenAI GPT-4o (primary)
        │       │     └─ fails? → retry (p-retry, 3x)
        │       └─ Claude 3.5 Sonnet (fallback)
        │
        ├─ Parse: riskScore, issues[], approved
        ├─ Save AIReviewEntity to Postgres
        ├─ If !approved → block pipeline stage
        │
        ▼
PipelinesService.updateStage('ai-review', 'success' | 'blocked')
        │
        ▼ (if approved)
BuildsModule → DeploymentModule → MonitoringModule
```

---

## Database Schema

```
projects
  ├── id (uuid, PK)
  ├── name
  ├── repoUrl
  ├── defaultBranch
  └── webhookSecret

pipeline_runs
  ├── id (uuid, PK)
  ├── projectId (FK → projects)
  ├── branch
  ├── commitSha
  ├── status (enum)
  ├── stages (jsonb)
  ├── triggeredAt
  └── completedAt

ai_reviews
  ├── id (uuid, PK)
  ├── pipelineRunId (FK → pipeline_runs)
  ├── riskScore (jsonb)
  ├── issues (jsonb[])
  ├── approved (boolean)
  ├── provider (enum: openai | anthropic)
  ├── tokensUsed
  ├── costUsd
  └── reviewedAt

deployments
  ├── id (uuid, PK)
  ├── pipelineRunId (FK)
  ├── imageTag
  ├── strategy (enum)
  ├── status (enum)
  ├── canaryWeight
  └── startedAt

monitoring_alerts
  ├── id (uuid, PK)
  ├── service
  ├── severity (enum)
  ├── metric
  ├── threshold / current
  ├── rootCause (AI-generated)
  ├── autoRollback
  └── detectedAt
```

---

## Queue Architecture

```
Redis
  └── BullMQ Queues
        ├── ai-review
        │     Workers: AIReviewProcessor (concurrency: 5)
        │     Job: { pipelineRunId, diff, projectId }
        │
        ├── pipeline
        │     Workers: PipelinesService (concurrency: 10)
        │     Job: { pipelineRunId, stage, action }
        │
        └── notifications
              Workers: NotificationsService (concurrency: 20)
              Job: { channel, event, payload }
```

---

## Real-time Events (Socket.io)

The frontend connects to `ws://api:3001` and subscribes to namespaced events:

| Event | Direction | Payload |
|-------|-----------|---------|
| `pipeline:stage_update` | Server → Client | `{ pipelineRunId, stage, status, duration }` |
| `pipeline:complete` | Server → Client | `{ pipelineRunId, status, durationMs }` |
| `anomaly:detected` | Server → Client | `AnomalyAlert` |
| `review:complete` | Server → Client | `{ reviewId, riskScore, approved }` |

---

## Security Model

| Layer | Mechanism |
|-------|-----------|
| API auth | JWT Bearer tokens (RS256) |
| Webhook auth | HMAC-SHA256 signature verification |
| DB passwords | Environment variables (never hardcoded) |
| AI keys | Server-side only (never exposed to client) |
| CORS | Restricted to `FRONTEND_URL` origin |
| Rate limiting | Per-IP throttle on public endpoints |

---

## Deployment Strategies

### Rolling Update (default)
- Gradually replaces old instances with new ones
- Zero downtime for stateless services
- Automatic rollback on health check failure

### Blue-Green
- Runs new version alongside old version
- Instant traffic switch via load balancer
- Old version kept alive for quick rollback

### Canary
- Routes X% of traffic to new version (default: 5%)
- Gradually increases based on error rate monitoring
- AI anomaly detection triggers automatic halt if metrics degrade

---

## Phase 2 Roadmap

| Feature | Technology |
|---------|-----------|
| Kubernetes deploy | Helm charts + `kubectl` |
| IaC | Terraform (AWS EKS / GCP GKE) |
| High-throughput events | Apache Kafka |
| Secret management | HashiCorp Vault |
| Distributed tracing | OpenTelemetry + Jaeger |
| Feature flags | LaunchDarkly / Unleash |
