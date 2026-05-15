# 🌐 AI DevOps — Web Dashboard

Next.js 14 SaaS frontend for the AI DevOps platform. Dark-mode glassmorphism design with real-time pipeline monitoring.

## 📋 Table of Contents

- [Pages & Routes](#pages--routes)
- [Design System](#design-system)
- [Components](#components)
- [Running Locally](#running-locally)
- [Environment Variables](#environment-variables)
- [Building for Production](#building-for-production)

---

## Pages & Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing | Hero, pipeline flow, stats, feature grid |
| `/dashboard` | Overview | Stats, activity chart, recent pipelines |
| `/dashboard/pipelines` | Pipelines | All pipeline runs with filters |
| `/dashboard/ai-review` | AI Review | Code review results and risk scores |
| `/dashboard/deployments` | Deployments | Deploy history, canary controls, rollback |
| `/dashboard/monitoring` | Monitoring | Metrics, anomalies, Grafana embed |
| `/dashboard/projects` | Projects | Project and webhook management |
| `/dashboard/settings` | Settings | API keys, thresholds, notification config |

---

## Design System

Defined in `src/app/globals.css`:

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-base` | `#0a0b0f` | Page background |
| `--bg-surface` | `#111318` | Cards |
| `--bg-surface-2` | `#1a1d26` | Elevated elements |
| `--border` | `rgba(255,255,255,0.06)` | Card borders |
| `--accent-purple` | `#7c3aed` | Primary CTA |
| `--accent-cyan` | `#06b6d4` | Branch labels, links |
| `--accent-green` | `#10b981` | Success states |
| `--accent-red` | `#ef4444` | Error / critical risk |
| `--accent-yellow` | `#f59e0b` | Medium risk / warnings |
| `--accent-orange` | `#f97316` | High risk |

### Typography

- **UI**: Inter (300–800 weights)
- **Code**: JetBrains Mono (400, 500)

### Component Classes

```css
.card              /* Glassmorphism card */
.card-glow         /* Card with purple glow on hover */
.btn               /* Base button */
.btn-primary       /* Purple gradient button */
.btn-secondary     /* Ghost/outline button */
.badge             /* Status/label badge */
.badge-success     /* Green badge */
.badge-danger      /* Red badge */
.badge-info        /* Blue badge */
.badge-warning     /* Yellow badge */
.badge-purple      /* Purple badge */
.stat-card         /* Metric stat card */
.stage-node        /* Pipeline stage circle */
.stage-connector   /* Connector line between stages */
.pipeline-flow     /* Horizontal pipeline container */
.table-container   /* Scrollable table wrapper */
```

### Risk Score Colors

| Score | Level | Color |
|-------|-------|-------|
| 0–29 | Low | `--accent-green` |
| 30–49 | Medium | `--accent-yellow` |
| 50–69 | High | `--accent-orange` |
| 70–100 | Critical | `--accent-red` |

---

## Components

### Layout Components

| File | Description |
|------|-------------|
| `src/app/layout.tsx` | Root layout — fonts, metadata |
| `src/app/dashboard/layout.tsx` | Dashboard shell with sidebar |

### Page Components

| File | Key Features |
|------|-------------|
| `src/app/page.tsx` | Framer Motion hero, pipeline flow, feature grid |
| `src/app/dashboard/page.tsx` | Stats, Recharts area chart, pipeline table |
| `src/app/dashboard/ai-review/page.tsx` | Risk score bars, decision badges |
| `src/app/dashboard/deployments/page.tsx` | Strategy breakdown, rollback buttons |

### External Libraries Used

| Library | Purpose |
|---------|---------|
| `framer-motion` | Page and element animations |
| `recharts` | Area charts (pipeline activity) |
| `socket.io-client` | Real-time pipeline updates (planned) |
| `swr` | Data fetching + cache (planned) |

---

## Running Locally

```bash
# From monorepo root
powershell -ExecutionPolicy Bypass -Command "pnpm --filter @aidevops/web dev"

# Direct
cd apps/web
powershell -ExecutionPolicy Bypass -Command "pnpm dev"
```

Runs at **http://localhost:3000**

---

## Environment Variables

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | NestJS API base URL | `http://localhost:3001` |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL for real-time | `ws://localhost:3001` |

---

## Building for Production

```bash
powershell -ExecutionPolicy Bypass -Command "pnpm --filter @aidevops/web build"
```

Uses Next.js **standalone** output mode for Docker-optimized images.

The Dockerfile at `infra/docker/web.Dockerfile` builds and serves the standalone bundle.
