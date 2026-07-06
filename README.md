<div align="center">

# ⚡ DevIntel AI

### AI-Powered Software Delivery Intelligence Platform

> Automated code review, risk analysis, governance enforcement, deployment orchestration, and anomaly detection — unified in one platform.

[![CI](https://github.com/Pikxul/DevIntelAI/actions/workflows/ci.yml/badge.svg)](https://github.com/Pikxul/DevIntelAI/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](./LICENSE)
[![pnpm](https://img.shields.io/badge/pnpm-9.x-orange)](https://pnpm.io)
[![Node](https://img.shields.io/badge/node-≥20.x-green)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED)](https://docs.docker.com/compose/)

</div>

---

## Table of Contents

- [Why DevIntel AI?](#why-devintel-ai)
- [System Architecture](#system-architecture)
- [High-Level Data Flow](#high-level-data-flow)
- [Monorepo Structure](#monorepo-structure)
- [Tech Stack](#tech-stack)
- [Entity-Relationship Model](#entity-relationship-model)
- [AI Review Pipeline — Deep Dive](#ai-review-pipeline--deep-dive)
- [Governance & Policy Engine](#governance--policy-engine)
- [Incident Intelligence](#incident-intelligence)
- [RBAC & Multi-Tenancy](#rbac--multi-tenancy)
- [API Reference](#api-reference)
- [Monitoring & Observability](#monitoring--observability)
- [VS Code Extension](#vs-code-extension)
- [Quick Start](#quick-start)
- [Local Sandbox & Webhook Simulation](#local-sandbox--webhook-simulation)
- [CI/CD Pipeline](#cicd-pipeline)
- [Production Deployment](#production-deployment)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Why DevIntel AI?

Engineering teams face fragmented tooling, invisible deployment risk, and reactive incident management. DevIntel AI solves this by placing **AI at the center of the software delivery lifecycle**:

| Problem | DevIntel AI Solution |
|---------|---------------------|
| Blind deployments | AI risk scoring (0–100) on every push & PR |
| Slow incident response | AI-generated Root Cause Analysis in seconds |
| Manual governance | Automated approve / review / block policies |
| Tool sprawl | Unified dashboard across GitHub, Slack, Jira, Prometheus |
| No cost visibility | Per-review token & USD cost tracking |

**Target Success Metrics:** 40% fewer deployment failures · 50% lower MTTR · 99.9% platform uptime

---

## System Architecture

```mermaid
graph TB
    subgraph Developer["🧑‍💻 Developer Touchpoints"]
        VS["VS Code Extension"]
        GH["GitHub (Push / PR)"]
    end

    subgraph Platform["☁️ DevIntel AI Platform"]
        direction TB
        subgraph Frontend["Next.js 14 SaaS Dashboard"]
            LP["Landing Page"]
            DASH["Dashboard"]
            AIV["AI Review View"]
            DEP["Deployments"]
            GOV["Governance"]
            INC["Incidents"]
            AN["Analytics"]
        end

        subgraph API["NestJS API (api/v1)"]
            WH["Webhook Gateway"]
            AUTH["Auth Module (JWT)"]
            PIPE["Pipeline Orchestrator"]
            AIR["AI Review Processor"]
            PE["Policy Engine"]
            BLD["Build Module"]
            DPL["Deployment Module"]
            MON["Monitoring Module"]
            NOT["Notification Module"]
            GW["WebSocket Gateway"]
        end

        subgraph Workers["BullMQ Workers"]
            AQ["AI Review Queue"]
            BQ["Build Queue"]
            DQ["Deploy Queue"]
        end
    end

    subgraph Data["💾 Data Layer"]
        PG["PostgreSQL 16"]
        RD["Redis 7"]
    end

    subgraph AI["🤖 AI Providers"]
        GEM["Gemini 2.0 Flash (Primary)"]
        OAI["OpenAI GPT-4o (Fallback)"]
        ANT["Claude 3.5 Sonnet (Fallback)"]
    end

    subgraph Observability["📊 Observability"]
        PROM["Prometheus"]
        GRAF["Grafana"]
    end

    subgraph Integrations["🔔 Integrations"]
        SL["Slack"]
        TM["Microsoft Teams"]
        JI["Jira"]
    end

    GH -->|Webhook| WH
    VS -->|REST API| AUTH
    WH --> PIPE
    PIPE --> AQ
    AQ --> AIR
    AIR --> GEM
    AIR -.->|Fallback| OAI
    AIR -.->|Fallback| ANT
    AIR --> PE
    PE --> BQ
    BQ --> BLD
    BLD --> DQ
    DQ --> DPL
    DPL --> MON
    MON --> NOT
    NOT --> SL
    NOT --> TM
    NOT --> JI

    PIPE --> PG
    PIPE --> RD
    AIR --> PG
    DPL --> PG

    GW -->|Real-time events| DASH
    MON --> PROM
    PROM --> GRAF

    classDef primary fill:#6366f1,stroke:#4f46e5,color:#fff
    classDef data fill:#06b6d4,stroke:#0891b2,color:#fff
    classDef ai fill:#f59e0b,stroke:#d97706,color:#fff
    classDef obs fill:#10b981,stroke:#059669,color:#fff
    classDef int fill:#ec4899,stroke:#db2777,color:#fff

    class WH,AUTH,PIPE,AIR,PE,BLD,DPL,MON,NOT,GW primary
    class PG,RD data
    class GEM,OAI,ANT ai
    class PROM,GRAF obs
    class SL,TM,JI int
```

---

## High-Level Data Flow

The platform processes code events through a multi-stage intelligent pipeline:

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant GH as GitHub
    participant WH as Webhook Gateway
    participant Q as BullMQ Queue
    participant AI as AI Review Processor
    participant PE as Policy Engine
    participant BD as Build & Deploy
    participant MON as Monitoring
    participant N as Notifications
    participant WS as WebSocket

    Dev->>GH: git push / Open PR
    GH->>WH: Webhook (HMAC verified)
    WH->>Q: Enqueue pipeline_run
    WS-->>Dev: 📡 pipeline_started

    Q->>AI: Process AI Code Review
    AI->>AI: Gemini 2.0 Flash (primary)
    alt Primary fails
        AI->>AI: GPT-4o fallback
    end
    alt All primary/secondary fail
        AI->>AI: Claude 3.5 fallback
    end
    AI-->>WS: 📡 ai_review_complete

    AI->>PE: Submit risk score + issues
    PE->>PE: Evaluate policy rules

    alt Risk ≤ threshold
        PE->>BD: ✅ Approved → Build
        BD->>BD: Docker build & push
        BD->>BD: Deploy (Rolling/Blue-Green/Canary)
        BD-->>WS: 📡 deployment_success
    else Risk > threshold
        PE-->>N: 🚫 Blocked / Needs Review
        PE-->>WS: 📡 pipeline_blocked
    end

    BD->>MON: Monitor metrics
    MON->>MON: AI anomaly detection

    alt Anomaly detected
        MON->>BD: 🔄 Auto-rollback
        MON->>N: 🚨 Alert
        MON-->>WS: 📡 anomaly_detected
    end

    N->>Dev: Slack / Teams / Jira / Email
```

### Core Data Flows

| Flow | Path |
|------|------|
| **Onboarding** | Sign Up → Create Org → OAuth GitHub → Install GitHub App → Select Repos → Initial Sync → Dashboard |
| **Event Ingestion** | GitHub Webhook → HMAC Validation → BullMQ Queue → Worker Processing → Database |
| **AI Analysis** | Code Event → Context Builder → Prompt Builder → LLM Inference → Risk Score → Policy Evaluation → Dashboard |
| **Incident Response** | Alert Detected → Correlation Engine → AI Root Cause Analysis → Notification Dispatch → Resolution Workflow |
| **Notification** | Platform Event → Rule Engine → Format Message → Dispatch (Slack / Teams / Jira / Email) |

---

## Monorepo Structure

```
devintelai/
├── apps/
│   ├── api/                    # NestJS backend API (16 feature modules)
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── ai-review/        # AI code review processor
│   │       │   ├── analytics/        # DORA metrics & reporting
│   │       │   ├── auth/             # JWT, RBAC, rate limiting, tenant isolation
│   │       │   ├── builds/           # Docker build orchestration
│   │       │   ├── deployments/      # Rolling / blue-green / canary deployments
│   │       │   ├── gateway/          # Socket.io real-time WebSocket gateway
│   │       │   ├── governance/       # Approval workflows & audit logs
│   │       │   ├── health/           # Health check endpoints
│   │       │   ├── monitoring/       # Prometheus metrics + AI anomaly detection
│   │       │   ├── notifications/    # Slack / Teams / Jira / Email dispatch
│   │       │   ├── organizations/    # Multi-tenant org management
│   │       │   ├── pipelines/        # Pipeline orchestration + BullMQ
│   │       │   ├── policy-engine/    # Rule-based approve / block / review
│   │       │   ├── projects/         # Repository CRUD & sync
│   │       │   ├── secrets/          # Vault-backed secret management
│   │       │   └── webhooks/         # GitHub/GitLab webhook receivers
│   │       └── entities/             # 20+ TypeORM entities
│   │
│   ├── web/                    # Next.js 14 SaaS dashboard
│   │   └── src/app/
│   │       ├── dashboard/
│   │       │   ├── ai-review/        # Risk scores, issue breakdown
│   │       │   ├── analytics/        # DORA metrics & charts
│   │       │   ├── deployments/      # Deploy status & rollback controls
│   │       │   ├── governance/       # Approval queues
│   │       │   ├── incidents/        # Timeline, RCA, rollback
│   │       │   ├── monitoring/       # Real-time metrics
│   │       │   ├── pipelines/        # Pipeline runs & stages
│   │       │   ├── policies/         # Policy rule management
│   │       │   ├── projects/         # Repository management
│   │       │   └── settings/         # Org & user settings
│   │       ├── auth/                 # Login / OAuth flows
│   │       └── onboarding/           # Guided setup wizard
│   │
│   └── vscode-extension/      # VS Code developer extension
│       └── src/extension.ts          # Review file, review selection, diagnostics
│
├── packages/
│   ├── ai-client/              # Unified AI abstraction (Gemini + OpenAI + Claude)
│   │   └── src/index.ts              # 770-line AI client with cost tracking
│   └── shared-types/           # Platform-wide TypeScript interfaces
│       └── src/index.ts              # 368 lines of type definitions
│
├── infra/
│   ├── docker/                 # Multi-stage Dockerfiles (API + Web)
│   └── monitoring/             # Prometheus scrape config
│
├── .github/workflows/
│   ├── ci.yml                  # Full CI/CD pipeline
│   └── deploy.yml              # Production deployment
│
├── docker-compose.yml          # 6-service local dev stack
├── turbo.json                  # Turborepo task orchestration
└── pnpm-workspace.yaml         # pnpm workspace definition
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14, React 18, Tailwind CSS | SaaS dashboard with dark-mode glassmorphism |
| **Backend** | NestJS, TypeORM, BullMQ | Modular API with queue-based pipeline processing |
| **AI Providers** | Gemini 2.0 Flash, GPT-4o, Claude 3.5 Sonnet | Multi-provider AI with automatic failover |
| **Database** | PostgreSQL 16 | Primary relational store with JSONB columns |
| **Cache & Queue** | Redis 7 + BullMQ | Job queues, caching, and session storage |
| **Authentication** | JWT + NextAuth.js | OAuth (GitHub, Google) with SSO (SAML/OIDC) |
| **Real-time** | Socket.io | WebSocket events for live pipeline updates |
| **Monitoring** | Prometheus + Grafana | Metrics collection & visualization |
| **Security Scanning** | Semgrep, Trivy | SAST + container vulnerability scanning |
| **CI/CD** | GitHub Actions | Automated lint → test → build → deploy pipeline |
| **Containerization** | Docker + Compose | Multi-stage builds, 6-service orchestration |
| **IDE** | VS Code Extension (TypeScript) | In-editor AI code review & diagnostics |
| **Monorepo** | pnpm Workspaces + Turborepo | Efficient dependency management & task caching |

---

## Entity-Relationship Model

The platform uses **20+ TypeORM entities** across PostgreSQL:

```mermaid
erDiagram
    Organization ||--o{ User : "has members"
    Organization ||--o{ Project : "owns"
    Organization ||--o{ AuditLog : "tracks"
    Organization ||--o{ PipelinePolicy : "configures"
    Organization ||--o{ SSOConfiguration : "enables"

    Project ||--o{ PipelineRun : "triggers"
    Project ||--o{ CommitEntity : "stores"
    Project ||--o{ PullRequest : "tracks"
    Project ||--o{ WebhookEvent : "receives"
    Project ||--o{ IncidentAlert : "raises"

    PipelineRun ||--|| AIReviewResult : "produces"
    PipelineRun ||--o{ Deployment : "deploys"
    PipelineRun ||--o| ApprovalRequest : "may require"

    Deployment ||--o{ AnomalyAlert : "triggers"

    IncidentAlert ||--o| RootCauseAnalysis : "analyzed by"
    IncidentAlert ||--o{ RollbackEvent : "may trigger"
    IncidentAlert ||--o{ IncidentTimeline : "has entries"

    Role ||--o{ RolePermission : "grants"
    Permission ||--o{ RolePermission : "assigned via"

    Organization {
        uuid id PK
        string name UK
        string slug UK
        string plan
        int githubInstallationId
    }

    User {
        uuid id PK
        string email UK
        string name
        string organizationId FK
        string role
        string provider
        boolean onboardingCompleted
    }

    Project {
        uuid id PK
        string organizationId FK
        string name
        string slug UK
        string repoUrl
        int riskThreshold
        string syncStatus
    }

    PipelineRun {
        uuid id PK
        string projectId FK
        string organizationId FK
        string commitSha
        string branch
        string status
        jsonb stages
        string triggeredBy
    }

    AIReviewResult {
        uuid id PK
        string pipelineRunId FK
        string provider
        string model
        jsonb riskScore
        jsonb issues
        boolean approved
        int tokensUsed
        decimal costUsd
    }

    Deployment {
        uuid id PK
        string pipelineRunId FK
        string imageTag
        string status
        string strategy
        int canaryWeight
    }
```

---

## AI Review Pipeline — Deep Dive

### Multi-Provider Strategy

The AI client (`packages/ai-client`) implements a **primary → fallback chain** with automatic failover:

```
Request ──► Gemini 2.0 Flash (primary, lowest cost)
               │
               ├─ Success → return result
               │
               └─ Failure ──► GPT-4o (secondary)
                                  │
                                  ├─ Success → return result
                                  │
                                  └─ Failure ──► Claude 3.5 Sonnet (tertiary)
                                                     │
                                                     └─ Success/Failure → return/error
```

### Capabilities

| Feature | Description |
|---------|------------|
| **Code Review** | Security, performance, quality, logic, maintainability analysis |
| **Risk Scoring** | 0–100 composite score with per-category breakdown |
| **Security Scan (SAST)** | OWASP Top 10, SQLi, XSS, CSRF, hardcoded secrets |
| **Anomaly Detection** | SRE-grade production metric analysis with rollback recommendations |
| **Commit Messages** | Conventional Commits auto-generation from diffs |
| **PR Summaries** | Technical markdown summaries for pull requests |

### Cost Tracking

Every AI inference is logged with token counts and USD cost:

```json
{
  "provider": "gemini",
  "model": "gemini-2.0-flash",
  "riskScore": {
    "overall": 43,
    "security": 60,
    "quality": 30,
    "performance": 25,
    "maintainability": 35,
    "level": "medium",
    "summary": "Medium-risk change with elevated security concerns"
  },
  "approved": true,
  "tokensUsed": 2847,
  "costUsd": 0.00031
}
```

### Cost per 1K Tokens

| Model | Input | Output |
|-------|-------|--------|
| Gemini 2.0 Flash | $0.0001 | $0.0004 |
| GPT-4o | $0.005 | $0.015 |
| Claude 3.5 Sonnet | $0.003 | $0.015 |

---

## Governance & Policy Engine

The policy engine enables **automated deployment governance** based on configurable rules:

```mermaid
flowchart LR
    A["AI Review Complete"] --> B{"Evaluate Policy Rules"}

    B -->|"overall_risk ≤ 40"| C["✅ Approved"]
    B -->|"40 < overall_risk ≤ 70"| D["⚠️ Needs Review"]
    B -->|"overall_risk > 70"| E["🚫 Blocked"]
    B -->|"critical_issues > 0"| E

    C --> F["Continue Pipeline"]
    D --> G["Approval Request Created"]
    G --> H{"Reviewer Decision"}
    H -->|Approved| F
    H -->|Rejected| I["Pipeline Terminated"]
    E --> I

    style C fill:#10b981,color:#fff
    style D fill:#f59e0b,color:#fff
    style E fill:#ef4444,color:#fff
```

### Policy Rule Schema

```typescript
interface PolicyRule {
  field: 'overall_risk' | 'security_risk' | 'quality_risk' | 'critical_issues' | 'high_issues';
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
}

type PolicyDecision = 'approved' | 'blocked' | 'needs_review';
```

### Audit Trail

Every governance action is recorded in a **tamper-evident audit log** with hash-chained entries:

| Field | Description |
|-------|-------------|
| `action` | e.g., `pipeline:approve`, `policy:update` |
| `resource` | Target entity type |
| `hash` | SHA-256 of the entry |
| `parentHash` | Hash of the previous entry (chain integrity) |

---

## Incident Intelligence

```mermaid
flowchart TB
    A["🚨 Alert Detected"] --> B["Incident Created"]
    B --> C["Correlation Engine"]
    C --> D["Link to Recent Deployments & Commits"]
    D --> E["AI Root Cause Analysis"]
    E --> F["Generate Hypothesis + Root Cause"]
    F --> G{"Severity Assessment"}

    G -->|Critical| H["Auto-Rollback Triggered"]
    G -->|High| I["Notification + Manual Review"]
    G -->|Medium/Low| J["Dashboard Alert"]

    H --> K["Rollback Event Logged"]
    K --> L["Timeline Entry Added"]
    I --> L
    J --> L
    L --> M["Resolution Tracking"]

    style A fill:#ef4444,color:#fff
    style H fill:#f97316,color:#fff
    style M fill:#10b981,color:#fff
```

### Root Cause Analysis Output

```json
{
  "summary": "Production latency spike correlated with deployment #143",
  "hypothesis": "Database migration introduced N+1 query pattern",
  "rootCause": "Missing index on payments.transaction_id column",
  "affectedComponents": ["payments-service", "postgres"],
  "recommendedActions": [
    "Add index on payments.transaction_id",
    "Rollback deployment #143",
    "Add query performance tests to CI"
  ],
  "confidenceScore": 87.5
}
```

---

## RBAC & Multi-Tenancy

The platform enforces **organization-scoped tenancy** with a global `TenantGuard` that prevents cross-tenant data access on every API request.

### Role Hierarchy

```
Organization Owner
        │
        ▼
      Admin
        │
  ┌─────┼──────────┬─────────┬──────────┐
  ▼     ▼          ▼         ▼          ▼
DevOps  SRE     Security    Dev      Viewer
```

### Permission Matrix

| Capability | Owner | Admin | DevOps | SRE | Security | Dev | Viewer |
|------------|:-----:|:-----:|:------:|:---:|:--------:|:---:|:------:|
| Manage users & billing | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Invite members | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Connect repositories | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage pipelines | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage policies | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Handle incidents | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View AI reviews | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| View dashboards | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View analytics | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Audit logs | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |

### Security Features

- **JWT Authentication** with configurable expiry
- **OAuth** via GitHub and Google
- **SSO** support (SAML / OIDC) per organization
- **Rate Limiting** via global `RateLimitGuard`
- **Idempotency** via `IdempotencyInterceptor`
- **Request Logging** via `LoggingMiddleware`
- **Webhook HMAC Verification** for GitHub/GitLab payloads

---

## API Reference

The API is versioned under `/api/v1` with full **Swagger/OpenAPI** documentation available at `/api/docs`.

### Module Endpoints

| Module | Base Path | Description |
|--------|-----------|-------------|
| **Auth** | `/api/v1/auth` | Login, register, OAuth callbacks, token refresh |
| **Organizations** | `/api/v1/organizations` | Org CRUD, member management, SSO config |
| **Projects** | `/api/v1/projects` | Repository CRUD, sync triggers, settings |
| **Pipelines** | `/api/v1/pipelines` | Pipeline runs, stage status, manual triggers |
| **AI Review** | `/api/v1/ai-review` | Review results, risk scores, cost tracking |
| **Builds** | `/api/v1/builds` | Docker build status, logs, artifacts |
| **Deployments** | `/api/v1/deployments` | Deploy status, rollback, canary controls |
| **Monitoring** | `/api/v1/monitoring` | Metric snapshots, anomaly alerts |
| **Governance** | `/api/v1/governance` | Approval requests, audit logs |
| **Policies** | `/api/v1/policies` | Policy CRUD, rule management |
| **Notifications** | `/api/v1/notifications` | Channel config, notification logs |
| **Webhooks** | `/api/v1/webhooks` | GitHub/GitLab webhook receivers |
| **Analytics** | `/api/v1/analytics` | DORA metrics, risk trends, reporting |
| **Health** | `/api/v1/health` | Liveness & readiness probes |

### WebSocket Events

Real-time updates are delivered via **Socket.io** on the same API port:

| Event | Payload | Description |
|-------|---------|-------------|
| `pipeline:stage_update` | `PipelineStageUpdateEvent` | Stage status change |
| `pipeline:complete` | `PipelineRun` | Pipeline finished |
| `ai_review:complete` | `AIReviewResult` | AI review results ready |
| `deployment:status` | `Deployment` | Deployment status change |
| `anomaly:detected` | `AnomalyDetectedEvent` | Anomaly alert with deployment context |
| `rollback:triggered` | `RollbackEvent` | Auto/manual rollback initiated |

---

## Monitoring & Observability

```
                     ┌─────────────────┐
                     │   NestJS API    │
                     │  /metrics       │
                     └────────┬────────┘
                              │ scrape every 15s
                     ┌────────▼────────┐
                     │   Prometheus    │
                     │   :9090        │
                     └────────┬────────┘
                              │ query
                     ┌────────▼────────┐
                     │    Grafana      │
                     │    :3030       │
                     └─────────────────┘
```

### AI Anomaly Detection

The monitoring module feeds live metrics into the AI anomaly detection engine, which evaluates:

| Anomaly Type | Description |
|-------------|-------------|
| `error_rate_spike` | Sudden increase in HTTP 5xx responses |
| `latency_spike` | P99 latency exceeds expected range |
| `memory_leak` | Monotonically increasing memory usage |
| `cpu_spike` | CPU usage exceeds safe thresholds |
| `pod_crash_loop` | Repeated container restarts |
| `traffic_drop` | Unexpected decrease in request volume |

When confidence exceeds the threshold, **auto-rollback** is triggered and notifications are dispatched to all configured channels.

---

## VS Code Extension

### Install from Source

```bash
cd apps/vscode-extension
pnpm compile
# Press F5 in VS Code to launch Extension Development Host
```

### Commands

| Command | Description |
|---------|-------------|
| `DevIntelAI: Review Current File` | AI review of the active file |
| `DevIntelAI: Review Selection` | AI review of selected code block |
| `DevIntelAI: Open Dashboard` | Open the web dashboard in browser |

### Features

- 🔴 **Inline Diagnostics** — Squiggly underlines on detected issues
- 📊 **Status Bar** — Color-coded risk score indicator
- 💾 **Auto-review on Save** — Configurable automatic reviews
- ⚙️ **Configurable Settings:**

```json
{
  "aidevops.apiUrl": "http://localhost:3001",
  "aidevops.riskThreshold": 70,
  "aidevops.autoReviewOnSave": false,
  "aidevops.showInlineAnnotations": true
}
```

---

## Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 20.x |
| pnpm | ≥ 9.x |
| Docker + Compose | Latest |

### 1. Clone & Install

```bash
git clone https://github.com/Pikxul/DevIntelAI.git
cd DevIntelAI
cp .env.example .env          # Fill in your API keys
pnpm install
```

### 2. Configure Environment

Edit `.env` and set at minimum:

```env
# Required — platform will not start without these
DATABASE_URL=postgresql://aidevops:aidevops@localhost:5432/aidevops
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret
NEXTAUTH_SECRET=your-nextauth-secret

# AI Providers (at least one required)
GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# GitHub Integration
GITHUB_WEBHOOK_SECRET=your-secret
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
```

See [`.env.example`](./.env.example) for the complete variable reference.

### 3. Start Infrastructure

```bash
docker-compose up postgres redis -d
```

### 4. Run Development Servers

```bash
# All apps in parallel via Turborepo
pnpm dev

# Or individually
pnpm --filter @aidevops/api dev
pnpm --filter @aidevops/web dev
```

### 5. Access

| Service | URL |
|---------|-----|
| 🌐 Web Dashboard | http://localhost:3000 |
| 🔌 API + Swagger | http://localhost:3001/api/docs |
| 📊 Grafana | http://localhost:3030 |
| 🔍 Prometheus | http://localhost:9090 |

---

## Local Sandbox & Webhook Simulation

Test the full **E2E flow** locally without GitHub tunneling:

### 1. Enable Webhook Bypass

```env
GITHUB_WEBHOOK_SKIP_VALIDATION=true
```

### 2. Trigger Mock Webhook

```bash
pnpm webhook:simulate
```

This sends a realistic GitHub push payload (with a vulnerability-laden diff) to your local NestJS server.

### 3. Watch the Pipeline

Open [http://localhost:3000/dashboard/pipelines](http://localhost:3000/dashboard/pipelines) to see the `feature/auth-sandbox` pipeline flow through AI review, security scanning, and completion in real-time.

---

## CI/CD Pipeline

The [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) pipeline runs on every push and PR:

```
push / PR
  │
  ├─ 🔍 Lint & Type Check
  ├─ 🤖 AI Code Review (diff → API → risk score)
  ├─ 🛡️ Security Scan (Semgrep + Trivy → SARIF)
  ├─ 🧪 Tests (with real Postgres + Redis via services)
  ├─ 🐳 Docker Build & Push (main branch only)
  └─ 🚀 Deploy → Slack notification
```

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `DEVINTELAI_API_URL` | Deployed API URL |
| `DEVINTELAI_API_TOKEN` | API JWT token |
| `DOCKER_USERNAME` | Docker Hub username |
| `DOCKER_PASSWORD` | Docker Hub password/token |
| `SLACK_WEBHOOK_URL` | Slack incoming webhook |
| `SEMGREP_APP_TOKEN` | Semgrep Cloud token |

---

## Production Deployment

```bash
# Build and start all 6 services
docker-compose up -d

# View logs
docker-compose logs -f api

# Scale API horizontally
docker-compose up -d --scale api=3
```

### Services in Production Stack

| Service | Image | Port |
|---------|-------|------|
| PostgreSQL | `postgres:16-alpine` | 5432 |
| Redis | `redis:7-alpine` | 6379 |
| API | `infra/docker/api.Dockerfile` | 3001 |
| Web | `infra/docker/web.Dockerfile` | 3000 |
| Prometheus | `prom/prometheus:v2.51.2` | 9090 |
| Grafana | `grafana/grafana:10.4.2` | 3030 |

---

## Roadmap

| Feature | Status |
|---------|--------|
| Kubernetes manifests + Helm charts | 🔜 Planned |
| Terraform modules (AWS / GCP) | 🔜 Planned |
| Kafka migration from BullMQ | 🔜 Planned |
| Grafana dashboard JSON provisioning | 🔜 Planned |
| SonarCloud integration | 🔜 Planned |
| VS Code pre-commit hook integration | 🔜 Planned |
| Canary traffic splitting | 🔜 Planned |
| GitLab & Bitbucket support | 🔜 Planned |

---

## Documentation

| Document | Description |
|----------|-------------|
| [apps/api/README.md](./apps/api/README.md) | NestJS API reference |
| [apps/web/README.md](./apps/web/README.md) | Next.js frontend guide |
| [apps/vscode-extension/README.md](./apps/vscode-extension/README.md) | VS Code extension guide |
| [packages/ai-client/README.md](./packages/ai-client/README.md) | AI client library |
| [packages/shared-types/README.md](./packages/shared-types/README.md) | Shared type definitions |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contribution guide |
| [CHANGELOG.md](./CHANGELOG.md) | Release history |
| [PRD.md](./PRD.md) | Product Requirements Document |

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, coding standards, branching strategy, and PR process.

```bash
# Quick contributor workflow
git checkout -b feat/your-feature
# ... make changes ...
pnpm turbo lint
pnpm turbo build
pnpm turbo test
# Open PR against develop
```

---

## License

MIT © DevIntel AI Platform
