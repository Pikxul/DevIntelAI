# 🔌 AI DevOps — NestJS API

The backend engine of the AI DevOps platform. Orchestrates pipelines, AI reviews, deployments, monitoring, and real-time events.

## 📋 Table of Contents

- [Architecture](#architecture)
- [Modules](#modules)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [Database](#database)
- [Queue System](#queue-system)
- [WebSockets](#websockets)

---

## Architecture

```
apps/api/src/
├── main.ts                    # Bootstrap (Swagger, validation, CORS)
├── app.module.ts              # Root module
├── entities/                  # TypeORM entities
│   └── index.ts               # Project, PipelineRun, AIReview, Deployment, ...
└── modules/
    ├── auth/                  # JWT authentication
    ├── pipelines/             # Pipeline CRUD + orchestration
    ├── ai-review/             # AI code review queue processor
    ├── builds/                # Docker build orchestration
    ├── deployments/           # Deploy + rollback logic
    ├── monitoring/            # Metrics ingest + anomaly detection
    ├── webhooks/              # GitHub webhook receiver
    ├── notifications/         # Slack integration
    ├── projects/              # Project management
    └── gateway/               # Socket.io real-time gateway
```

---

## Modules

### `AuthModule`
- `POST /api/v1/auth/login` — issue JWT
- `GET  /api/v1/auth/me` — current user

### `PipelinesModule`
- `GET    /api/v1/pipelines` — list runs (filterable)
- `POST   /api/v1/pipelines` — trigger new run
- `GET    /api/v1/pipelines/:id` — run detail
- `PATCH  /api/v1/pipelines/:id/stage` — update stage status

### `AIReviewModule`
- `POST /api/v1/ai-review/github` — trigger review from GitHub diff
- `POST /api/v1/ai-review/inline` — inline review (VS Code extension)
- `GET  /api/v1/ai-review` — list all reviews
- `GET  /api/v1/ai-review/:id` — review detail

### `WebhooksModule`
- `POST /api/v1/webhooks/github` — GitHub push/PR events (HMAC verified)

### `DeploymentsModule`
- `POST /api/v1/deployments` — trigger deployment
- `GET  /api/v1/deployments` — list deployments
- `POST /api/v1/deployments/:id/rollback` — rollback

### `MonitoringModule`
- `POST /api/v1/monitoring/metrics` — ingest metric snapshot
- `GET  /api/v1/monitoring/anomalies` — list detected anomalies
- `GET  /api/v1/metrics` — Prometheus-format metrics endpoint

### `ProjectsModule`
- `GET    /api/v1/projects` — list projects
- `POST   /api/v1/projects` — create project
- `GET    /api/v1/projects/:id` — project detail
- `DELETE /api/v1/projects/:id` — delete project

---

## API Reference

Full Swagger/OpenAPI docs available at: **`http://localhost:3001/api/docs`**

### Common Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Trigger a Pipeline Run

```http
POST /api/v1/pipelines
{
  "projectId": "proj_abc123",
  "branch": "main",
  "commitSha": "abc123def456",
  "commitMessage": "feat: add OAuth",
  "author": "alice"
}
```

### Inline AI Review (VS Code)

```http
POST /api/v1/ai-review/inline
Authorization: Bearer <token>
{
  "code": "function login(user, pass) { ... }",
  "filename": "auth.ts"
}
```

Response:
```json
{
  "riskScore": { "overall": 72, "security": 85, "quality": 60, "level": "high" },
  "approved": false,
  "blockedReason": "Critical security issues detected",
  "issues": [
    {
      "line": 14,
      "riskLevel": "critical",
      "category": "security",
      "title": "SQL Injection vulnerability",
      "description": "User input directly interpolated into query",
      "suggestion": "Use parameterized queries: db.query('SELECT * FROM users WHERE id = $1', [id])"
    }
  ]
}
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | required |
| `REDIS_URL` | Redis connection URL | required |
| `OPENAI_API_KEY` | OpenAI API key | required |
| `ANTHROPIC_API_KEY` | Anthropic/Claude key | optional |
| `GITHUB_WEBHOOK_SECRET` | GitHub webhook HMAC secret | required |
| `JWT_SECRET` | JWT signing secret | required |
| `SLACK_BOT_TOKEN` | Slack bot token | optional |
| `SLACK_CHANNEL_ID` | Slack channel for notifications | optional |
| `PORT` | Server port | `3001` |
| `AI_RISK_THRESHOLD` | Score (0–100) to block pipeline | `70` |

---

## Running Locally

```bash
# Install deps (from monorepo root)
powershell -ExecutionPolicy Bypass -Command "pnpm install"

# Start Postgres + Redis
docker-compose up postgres redis -d

# Run API in watch mode
powershell -ExecutionPolicy Bypass -Command "pnpm --filter @aidevops/api dev"
```

---

## Database

Uses **TypeORM** with **PostgreSQL**. Entities auto-sync in development (`synchronize: true`).

### Key Entities

| Entity | Table | Description |
|--------|-------|-------------|
| `ProjectEntity` | `projects` | Repository / project config |
| `PipelineRunEntity` | `pipeline_runs` | Individual pipeline executions |
| `AIReviewEntity` | `ai_reviews` | AI review results + risk scores |
| `DeploymentEntity` | `deployments` | Deployment history |
| `MonitoringAlertEntity` | `monitoring_alerts` | Detected anomalies |

---

## Queue System

Uses **BullMQ** + Redis for async job processing.

| Queue | Processor | Purpose |
|-------|-----------|---------|
| `ai-review` | `AIReviewProcessor` | Process AI code reviews |
| `pipeline` | `PipelinesService` | Orchestrate pipeline stages |
| `notifications` | `NotificationsService` | Send Slack messages |

---

## WebSockets

Real-time events via **Socket.io** at `ws://localhost:3001`.

### Events emitted by server

| Event | Payload |
|-------|---------|
| `pipeline:stage_update` | `{ pipelineRunId, stage, status, duration }` |
| `pipeline:complete` | `{ pipelineRunId, status, durationMs }` |
| `anomaly:detected` | `{ service, metric, threshold, current }` |
| `review:complete` | `{ reviewId, riskScore, approved }` |

### Client subscription

```typescript
const socket = io('http://localhost:3001');
socket.on('pipeline:stage_update', (data) => console.log(data));
```
