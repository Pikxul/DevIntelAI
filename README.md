# ⚡ AI DevOps Platform

> **AI-powered DevOps orchestration** — automated code review, risk analysis, deployment, and anomaly detection in one unified platform.

[![CI](https://github.com/your-org/aidevops/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/aidevops/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](./LICENSE)
[![pnpm](https://img.shields.io/badge/pnpm-9.x-orange)](https://pnpm.io)
[![Node](https://img.shields.io/badge/node-20.x-green)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org)

---

## 🏗️ Architecture

```
Developer git push
    │
    ▼
GitHub Webhook ──► NestJS API
    │
    ▼ (BullMQ queue)
AI Review (GPT-4o + Claude 3.5)
    │
    ▼
Static Analysis (Semgrep · ESLint · SonarCloud)
    │
    ▼
Security Scan (Trivy · Snyk)
    │
    ▼
Automated Tests (Unit · Integration)
    │
    ▼
Docker Build & Push (Registry)
    │
    ▼
Deploy (Rolling · Blue-Green · Canary)
    │
    ▼
Monitor (Prometheus · Grafana)
    │
    ▼
AI Anomaly Detection → Auto-Rollback
    │
    ▼
Slack / Teams / Jira Notifications
```

---

## 📦 Monorepo Structure

```
aiDevOps/
├── apps/
│   ├── web/                  # Next.js 14 SaaS dashboard
│   ├── api/                  # NestJS backend API
│   └── vscode-extension/     # VS Code developer extension
├── packages/
│   ├── shared-types/         # Shared TypeScript interfaces
│   └── ai-client/            # OpenAI + Claude abstraction
├── infra/
│   ├── docker/               # Dockerfiles
│   ├── k8s/                  # Kubernetes manifests (Phase 2)
│   ├── terraform/            # IaC (Phase 2)
│   └── monitoring/           # Prometheus + Grafana config
├── .github/
│   └── workflows/ci.yml      # Full CI/CD pipeline
├── docker-compose.yml        # Local dev stack
└── .env.example              # Environment variable template
```

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 20.x |
| pnpm | ≥ 9.x |
| Docker + Compose | Latest |

### 1. Clone & Install

```bash
git clone https://github.com/your-org/aidevops.git
cd aidevops
cp .env.example .env          # Fill in your API keys
powershell -ExecutionPolicy Bypass -Command "pnpm install"
```

### 2. Configure Environment

Edit `.env` and set at minimum:

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_WEBHOOK_SECRET=your-secret
```

See [`.env.example`](./.env.example) for all variables.

### 3. Start Infrastructure

```bash
docker-compose up postgres redis -d
```

### 4. Run Development Servers

```bash
# All apps in parallel
powershell -ExecutionPolicy Bypass -Command "pnpm dev"

# Or individually
powershell -ExecutionPolicy Bypass -Command "pnpm --filter @aidevops/web dev"
powershell -ExecutionPolicy Bypass -Command "pnpm --filter @aidevops/api dev"
```

### 5. Access

| Service | URL |
|---------|-----|
| 🌐 Web Dashboard | http://localhost:3000 |
| 🔌 API + Swagger | http://localhost:3001/api/docs |
| 📊 Grafana | http://localhost:3030 |
| 🔍 Prometheus | http://localhost:9090 |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| VS Code Extension | TypeScript |
| Frontend SaaS | Next.js 14 |
| Backend API | NestJS (Node.js) |
| AI Services | OpenAI GPT-4o + Claude 3.5 Sonnet |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7 + BullMQ |
| Authentication | JWT (Auth0 ready) |
| Monitoring | Prometheus + Grafana |
| Containerization | Docker + Compose |
| CI/CD | GitHub Actions |
| Static Analysis | Semgrep + ESLint |
| Security Scanning | Trivy |

---

## 🤖 AI Review Pipeline

Every `git push` or pull request automatically triggers:

1. **AI Code Review** — GPT-4o analyzes the diff for security, quality, logic, and performance issues
2. **Risk Scoring** — 0–100 score with per-category breakdown
3. **Auto-block** — pipelines with risk score > threshold (default: 70) are blocked
4. **Fallback** — if OpenAI fails, Claude 3.5 Sonnet takes over automatically
5. **Cost tracking** — every review logs token usage and USD cost

```json
{
  "riskScore": { "overall": 43, "security": 60, "quality": 30, "level": "medium" },
  "approved": true,
  "issues": [{ "line": 42, "riskLevel": "high", "title": "SQL Injection Risk", "suggestion": "Use parameterized queries" }],
  "tokensUsed": 2847,
  "costUsd": 0.00312
}
```

---

## 📡 GitHub Webhook Setup

1. Go to your repo → **Settings → Webhooks → Add webhook**
2. Payload URL: `https://your-api.com/api/v1/webhooks/github?projectId=<id>&orgId=<id>`
3. Content-Type: `application/json`
4. Secret: value of `GITHUB_WEBHOOK_SECRET`
5. Events: `push`, `pull_request`

---

## 🧩 VS Code Extension

### Install from Source

```bash
cd apps/vscode-extension
powershell -ExecutionPolicy Bypass -Command "pnpm compile"
# Press F5 in VS Code to launch Extension Development Host
```

### Commands

| Command | Description |
|---------|-------------|
| `AI DevOps: Review Current File` | AI review of open file |
| `AI DevOps: Review Selection` | AI review of selected code |
| `AI DevOps: Open Dashboard` | Open web dashboard |

### Settings

```json
{
  "aidevops.apiUrl": "http://localhost:3001",
  "aidevops.riskThreshold": 70,
  "aidevops.autoReviewOnSave": false,
  "aidevops.showInlineAnnotations": true
}
```

---

## 🔄 CI/CD Pipeline (GitHub Actions)

The [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) pipeline runs:

```
push / PR
  │
  ├─ Lint & Type Check
  ├─ AI Code Review (PR diff → API → risk score)
  ├─ Security Scan (Semgrep + Trivy → SARIF)
  ├─ Tests (with real Postgres + Redis)
  ├─ Docker Build & Push (main branch only)
  └─ Deploy → Slack notification
```

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `AIDEVOPS_API_URL` | Your deployed API URL |
| `AIDEVOPS_API_TOKEN` | API JWT token |
| `DOCKER_USERNAME` | Docker Hub username |
| `DOCKER_PASSWORD` | Docker Hub password / token |
| `SLACK_WEBHOOK_URL` | Slack incoming webhook |
| `SEMGREP_APP_TOKEN` | Semgrep Cloud token |

---

## 🐳 Production Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Scale API
docker-compose up -d --scale api=3
```

---

## 📖 Documentation

| Doc | Description |
|-----|-------------|
| [apps/api/README.md](./apps/api/README.md) | NestJS API reference |
| [apps/web/README.md](./apps/web/README.md) | Next.js frontend guide |
| [apps/vscode-extension/README.md](./apps/vscode-extension/README.md) | VS Code extension guide |
| [packages/ai-client/README.md](./packages/ai-client/README.md) | AI client library |
| [packages/shared-types/README.md](./packages/shared-types/README.md) | Shared type definitions |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System architecture deep-dive |
| [docs/API.md](./docs/API.md) | API endpoint reference |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contribution guide |
| [CHANGELOG.md](./CHANGELOG.md) | Release history |

---

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## 📄 License

MIT © AI DevOps Platform
