# Contributing to AI DevOps Platform

Thank you for your interest in contributing! This guide covers the development workflow, coding standards, and pull request process.

---

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Running Tests](#running-tests)

---

## Development Setup

### Prerequisites

- **Node.js** ≥ 20.x
- **pnpm** ≥ 9.x (`npm install -g pnpm@9`)
- **Docker** + Docker Compose

### First-time Setup

```bash
git clone https://github.com/Pikxul/DevIntelAI.git
cd DevIntelAI
cp .env.example .env
# Fill in OPENAI_API_KEY, ANTHROPIC_API_KEY, GITHUB_WEBHOOK_SECRET

powershell -ExecutionPolicy Bypass -Command "pnpm install"
docker-compose up postgres redis -d
powershell -ExecutionPolicy Bypass -Command "pnpm dev"
```

---

## Development Workflow

### Branching Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production — always deployable |
| `develop` | Integration — PRs merge here first |
| `feat/<name>` | New features |
| `fix/<name>` | Bug fixes |
| `docs/<name>` | Documentation only |
| `refactor/<name>` | Code restructuring |

### Branch Naming

```bash
git checkout -b feat/ai-anomaly-slack-alert
git checkout -b fix/pipeline-stage-timeout
git checkout -b docs/update-api-reference
```

---

## Coding Standards

### TypeScript

- **Strict mode** is enforced — no `any` without explicit justification
- All functions and methods must have typed parameters and return types
- Use `interface` for object shapes, `type` for unions/aliases

```typescript
// ✅ Good
async function reviewCode(opts: ReviewOptions): Promise<AIReviewResult> { ... }

// ❌ Bad
async function reviewCode(opts: any) { ... }
```

### NestJS (API)

- One module per domain feature
- Business logic lives in `*.service.ts` — controllers only handle HTTP
- Use DTOs with `class-validator` decorators for all incoming data
- All endpoints must have Swagger `@ApiOperation` and `@ApiResponse` decorators

### Next.js (Web)

- All page components must use `'use client'` when using hooks or browser APIs
- Keep data fetching in server components where possible
- Use the global design system classes from `globals.css` — no inline `style` for colors

### File Naming

| Type | Convention | Example |
|------|-----------|---------|
| NestJS service | `kebab-case.service.ts` | `ai-review.service.ts` |
| NestJS module | `kebab-case.module.ts` | `pipelines.module.ts` |
| React page | `page.tsx` | `app/dashboard/page.tsx` |
| React component | `PascalCase.tsx` | `PipelineCard.tsx` |

---

## Commit Convention

We use **Conventional Commits**:

```
<type>(<scope>): <short summary>

[optional body]

[optional footer]
```

### Types

| Type | When to use |
|------|------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | No new feature, no bug fix |
| `test` | Adding or fixing tests |
| `chore` | Build process, dependency updates |
| `perf` | Performance improvement |
| `ci` | CI configuration changes |

### Examples

```bash
git commit -m "feat(ai-review): add Claude fallback provider"
git commit -m "fix(webhooks): handle GitHub ping event gracefully"
git commit -m "docs(api): add WebSocket event reference"
git commit -m "chore(deps): update openai to 4.47.0"
```

---

## Pull Request Process

1. **Fork** the repo and create your branch from `develop`
2. **Make your changes** following the coding standards above
3. **Add tests** for any new functionality
4. **Run the full check** before submitting:
   ```bash
   powershell -ExecutionPolicy Bypass -Command "pnpm turbo lint"
   powershell -ExecutionPolicy Bypass -Command "pnpm turbo build"
   powershell -ExecutionPolicy Bypass -Command "pnpm turbo test"
   ```
5. **Open a PR** against `develop`
6. Fill in the **PR template** fully
7. The CI pipeline will run — all checks must pass
8. AI Review will score your diff — high risk PRs (> 70) are auto-blocked
9. A maintainer will review within 2 business days

### PR Title Format

```
feat(scope): Short description of change
```

---

## Running Tests

```bash
# All tests (requires Postgres + Redis running)
powershell -ExecutionPolicy Bypass -Command "pnpm turbo test"

# API tests only
powershell -ExecutionPolicy Bypass -Command "pnpm --filter @aidevops/api test"

# Watch mode
powershell -ExecutionPolicy Bypass -Command "pnpm --filter @aidevops/api test:watch"

# Coverage
powershell -ExecutionPolicy Bypass -Command "pnpm --filter @aidevops/api test:cov"
```

---

## Reporting Issues

Use **GitHub Issues** with the appropriate label:

- `bug` — Something is broken
- `enhancement` — Feature request
- `documentation` — Docs issue
- `question` — Usage question

Please include:
- Steps to reproduce
- Expected vs actual behavior
- Environment (OS, Node version, Docker version)

---

## Code of Conduct

Be respectful, inclusive, and constructive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).
