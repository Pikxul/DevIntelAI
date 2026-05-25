# Changelog

All notable changes to the AI DevOps Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Kubernetes manifests + Helm charts
- Terraform modules for AWS/GCP
- Kafka migration from BullMQ for high-throughput events
- Grafana dashboard JSON provisioning
- SonarCloud integration
- VS Code pre-commit hook integration
- Canary traffic splitting implementation

---

## [0.1.0] — 2026-05-13

### Added

#### Platform Foundation
- Monorepo scaffold with `pnpm` workspaces and **Turborepo** task orchestration
- `packages/shared-types` — platform-wide TypeScript interfaces (Pipeline, AI Review, Deployment, Monitoring, WebSocket events)
- `packages/ai-client` — unified AI abstraction over OpenAI GPT-4o + Anthropic Claude 3.5 Sonnet with retry logic and cost tracking
- `.env.example` — comprehensive environment variable template

#### Backend API (`apps/api`)
- NestJS application with Swagger/OpenAPI docs at `/api/docs`
- Global JWT authentication (`AuthModule`)
- Pipeline orchestration with BullMQ queuing (`PipelinesModule`)
- AI code review processor with primary/fallback provider strategy (`AIReviewModule`)
- GitHub webhook receiver with HMAC signature verification (`WebhooksModule`)
- Docker build orchestration (`BuildsModule`)
- Rolling / blue-green / canary deployment logic (`DeploymentsModule`)
- Prometheus metrics ingest + AI anomaly detection (`MonitoringModule`)
- Slack Block Kit notifications (`NotificationsModule`)
- Project management CRUD (`ProjectsModule`)
- Socket.io real-time gateway for pipeline events (`GatewayModule`)
- TypeORM entities: Project, PipelineRun, AIReview, Deployment, MonitoringAlert

#### Frontend SaaS (`apps/web`)
- Next.js 14 with dark-mode glassmorphism design system (`globals.css`)
- Landing page with animated hero, pipeline flow visualization, stats, feature grid
- Dashboard overview: stats grid, Recharts activity chart, AI cost tracker, pipeline table
- AI Review page: risk score progress bars, decision badges, cost tracking
- Deployments page: strategy breakdown, environment badges, rollback controls
- Sidebar navigation with API status indicator
- Framer Motion animations throughout
- Inter + JetBrains Mono typography (Google Fonts)

#### VS Code Extension (`apps/vscode-extension`)
- `aidevops.reviewFile` command — AI review of current file
- `aidevops.reviewSelection` command — AI review of selected code
- Inline VS Code Diagnostics (squiggly underlines) on detected issues
- Status bar risk score with color-coded backgrounds
- Auto-review on save (configurable)
- Connection error handling with actionable error messages

#### Infrastructure
- `docker-compose.yml` — 6-service local stack: Postgres, Redis, API, Web, Prometheus, Grafana
- `infra/docker/api.Dockerfile` — multi-stage NestJS Docker image
- `infra/docker/web.Dockerfile` — multi-stage Next.js standalone Docker image
- `infra/monitoring/prometheus.yml` — Prometheus scrape configuration
- `.github/workflows/ci.yml` — full CI/CD: lint → AI review → Semgrep/Trivy → tests → Docker build → deploy → Slack

#### Documentation
- `README.md` — root monorepo guide
- `apps/api/README.md` — NestJS API reference
- `apps/web/README.md` — Next.js frontend guide
- `apps/vscode-extension/README.md` — VS Code extension guide
- `packages/ai-client/README.md` — AI client library reference
- `packages/shared-types/README.md` — type definition reference
- `docs/ARCHITECTURE.md` — system architecture deep-dive
- `CONTRIBUTING.md` — contributor guide
- `CHANGELOG.md` — this file

---

[Unreleased]: https://github.com/Pikxul/DevIntelAI/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Pikxul/DevIntelAI/releases/tag/v0.1.0
