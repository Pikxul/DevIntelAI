# API Reference

Full REST API reference for the AI DevOps Platform.

**Base URL:** `http://localhost:3001/api/v1`  
**Swagger UI:** `http://localhost:3001/api/docs`

---

## Authentication

All endpoints (except `/auth/login` and `/webhooks/*`) require a Bearer token:

```http
Authorization: Bearer <jwt_token>
```

Obtain a token:

```http
POST /api/v1/auth/login
Content-Type: application/json

{ "email": "user@example.com", "password": "secret" }
```

Response:
```json
{ "access_token": "eyJhbGciOiJSUzI1NiJ9...", "expiresIn": 3600 }
```

---

## Pipelines

### List Pipeline Runs

```http
GET /api/v1/pipelines?projectId=<id>&status=running&limit=20&offset=0
```

### Trigger a Pipeline

```http
POST /api/v1/pipelines
{
  "projectId": "proj_abc123",
  "branch": "main",
  "commitSha": "abc123def",
  "commitMessage": "feat: add login",
  "author": "alice"
}
```

### Get Pipeline Detail

```http
GET /api/v1/pipelines/:id
```

### Update Stage Status

```http
PATCH /api/v1/pipelines/:id/stage
{
  "stage": "ai-review",
  "status": "success",
  "durationMs": 4200
}
```

---

## AI Review

### Trigger Review (GitHub diff)

```http
POST /api/v1/ai-review/github
{
  "diff": "--- a/auth.ts\n+++ b/auth.ts\n...",
  "pipelineRunId": "run_xyz789"
}
```

### Inline Review (VS Code)

```http
POST /api/v1/ai-review/inline
{
  "code": "function login(user, pass) { ... }",
  "filename": "auth.ts"
}
```

**Response:**
```json
{
  "riskScore": {
    "overall": 72,
    "security": 85,
    "quality": 60,
    "performance": 40,
    "level": "high",
    "summary": "Critical SQL injection risk detected in query builder"
  },
  "approved": false,
  "blockedReason": "Risk score 72 exceeds threshold 70",
  "issues": [
    {
      "file": "auth.ts",
      "line": 14,
      "riskLevel": "critical",
      "category": "security",
      "title": "SQL Injection",
      "description": "User input directly interpolated into SQL query",
      "suggestion": "Use parameterized queries: db.query('SELECT * FROM users WHERE id = $1', [id])"
    }
  ],
  "provider": "openai",
  "tokensUsed": 2847,
  "costUsd": 0.00312
}
```

### List Reviews

```http
GET /api/v1/ai-review?pipelineRunId=<id>&approved=false&limit=20
```

---

## Deployments

### Trigger Deployment

```http
POST /api/v1/deployments
{
  "pipelineRunId": "run_xyz789",
  "imageTag": "api-service:abc123def",
  "target": {
    "name": "production",
    "environment": "production",
    "type": "kubernetes",
    "strategy": "canary",
    "namespace": "default"
  }
}
```

### List Deployments

```http
GET /api/v1/deployments?projectId=<id>&environment=production
```

### Rollback

```http
POST /api/v1/deployments/:id/rollback
```

---

## Monitoring

### Ingest Metrics

```http
POST /api/v1/monitoring/metrics
{
  "service": "api-service",
  "errorRate": 0.12,
  "latencyP50": 120,
  "latencyP99": 4200,
  "requestsPerSecond": 340,
  "cpuPercent": 87,
  "memoryPercent": 64
}
```

### List Anomalies

```http
GET /api/v1/monitoring/anomalies?service=api-service&severity=critical
```

### Prometheus Metrics

```http
GET /api/v1/metrics
```

Returns Prometheus-format text. Used by `prometheus.yml` scrape config.

---

## Webhooks

### GitHub Webhook

```http
POST /api/v1/webhooks/github?projectId=<id>&orgId=<id>
X-Hub-Signature-256: sha256=<hmac>
X-GitHub-Event: push
Content-Type: application/json

{ ...github_push_payload }
```

The endpoint verifies the HMAC signature before processing. GitHub sends this automatically when configured.

---

## Projects

### Create Project

```http
POST /api/v1/projects
{
  "name": "api-service",
  "repoUrl": "https://github.com/org/api-service",
  "defaultBranch": "main",
  "riskThreshold": 70
}
```

### List Projects

```http
GET /api/v1/projects
```

### Get Project

```http
GET /api/v1/projects/:id
```

### Delete Project

```http
DELETE /api/v1/projects/:id
```

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request — invalid input |
| `401` | Unauthorized — missing/invalid token |
| `403` | Forbidden — insufficient permissions |
| `404` | Not Found |
| `409` | Conflict — duplicate resource |
| `422` | Unprocessable Entity — validation failed |
| `429` | Too Many Requests — rate limited |
| `500` | Internal Server Error |
| `503` | Service Unavailable — AI provider down |

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `POST /ai-review/*` | 60 req/min per user |
| `POST /webhooks/*` | 1000 req/min per IP |
| All others | 300 req/min per user |
