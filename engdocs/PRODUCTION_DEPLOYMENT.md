# Production Environment Variables & Deployment Guide

This document outlines the required and optional environment variables and deployment procedures for DevIntel AI in a production environment.

---

## 1. Security & Cryptographic Keys (Mandatory)

| Variable | Description | Example / Format | Required |
| :--- | :--- | :--- | :--- |
| `JWT_SECRET` | Secret key used to sign and verify internal authentication tokens between Web and API. | 32+ character high-entropy base64 string (`openssl rand -base64 32`) | **Yes** |
| `AUTH_SECRET` / `NEXTAUTH_SECRET` | Secret used by NextAuth.js session encryption. | 32+ character high-entropy base64 string (`openssl rand -base64 32`) | **Yes** |
| `ENCRYPTION_KEY` | 32-character AES-256 encryption key used for sensitive credential storage (e.g. GitHub tokens at rest). | Exactly 32 characters (`openssl rand -hex 16`) | **Yes** |
| `INCIDENT_WEBHOOK_SECRET` | Secret used to verify HMAC-SHA256 signatures on incident ingestion webhooks. | High-entropy string (`openssl rand -hex 32`) | **Yes** |

---

## 2. Authentication & Identity Providers

| Variable | Description | Example / Format | Required |
| :--- | :--- | :--- | :--- |
| `NEXTAUTH_URL` | Canonical public URL of the web application. | `https://app.devintel.ai` | **Yes** |
| `GITHUB_CLIENT_ID` | GitHub OAuth App Client ID for enterprise SSO / user login. | `Iv23...` | **Yes (if GitHub SSO enabled)** |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Client Secret. | Sensitive secret string | **Yes (if GitHub SSO enabled)** |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID for enterprise SSO. | `965245494...apps.googleusercontent.com` | Optional |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret. | `GOCSPX-...` | Optional |
| `NEXTAUTH_DEV_BYPASS` | Development bypass flag. **MUST be `false` in production.** | `false` | **Yes (`false`)** |

---

## 3. Database & Storage

| Variable | Description | Example / Format | Required |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string. | `postgresql://user:pass@host:5432/dbname?sslmode=require` | **Yes** |
| `TYPEORM_SYNC` | Auto-schema sync flag. **MUST be `false` in production** (use migrations). | `false` | **Yes (`false`)** |
| `REDIS_URL` | Redis instance for rate limiting and pub/sub cache. | `redis://default:pass@host:6379` | **Yes** |

---

## 4. GitHub App Integration

| Variable | Description | Example / Format | Required |
| :--- | :--- | :--- | :--- |
| `GITHUB_APP_ID` | GitHub App ID for repository and pipeline integration. | `3916158` | **Yes** |
| `GITHUB_APP_NAME` | GitHub App slug. | `devintelai` | **Yes** |
| `NEXT_PUBLIC_GITHUB_APP_NAME` | Client-accessible GitHub App slug for UI installation flows. | `devintelai` | **Yes** |
| `GITHUB_APP_PRIVATE_KEY` | RSA Private Key for the GitHub App (PEM format). | `"-----BEGIN RSA PRIVATE KEY-----\n..."` | **Yes** |
| `GITHUB_WEBHOOK_SECRET` | Webhook secret configured in the GitHub App. | Hex string | **Yes** |
| `GITHUB_WEBHOOK_SKIP_VALIDATION` | Webhook validation bypass. **MUST be `false` in production.** | `false` | **Yes (`false`)** |

---

## 5. API Endpoints & Networking

| Variable | Description | Example / Format | Required |
| :--- | :--- | :--- | :--- |
| `PORT` | API server listen port. | `3001` (or assigned by PaaS) | Optional |
| `API_URL` | Backend URL for server-to-server communication. | `https://api.devintel.ai` | **Yes** |
| `NEXT_PUBLIC_API_URL` | Public-facing API endpoint for client requests. | `https://api.devintel.ai` | **Yes** |
| `NEXT_PUBLIC_WS_URL` | Real-time WebSocket endpoint. | `wss://api.devintel.ai` | **Yes** |

---

## 6. AI & LLM Providers

| Variable | Description | Example / Format | Required |
| :--- | :--- | :--- | :--- |
| `AI_PRIMARY_PROVIDER` | Primary AI provider for static code analysis (`gemini` / `openai` / `anthropic`). | `gemini` | **Yes** |
| `GEMINI_API_KEY` | Google Gemini API key. | `AIza...` | If Gemini used |
| `OPENAI_API_KEY` | OpenAI API key. | `sk-...` | If OpenAI used |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key. | `sk-ant-...` | If Anthropic used |

---

## 7. Production Deployment Checklist

1. [ ] **Secrets Generated**: Run `openssl rand -base64 32` for `JWT_SECRET` and `AUTH_SECRET`.
2. [ ] **Encryption Key Set**: Generate a 32-character key for `ENCRYPTION_KEY`.
3. [ ] **Dev Bypasses Disabled**: Ensure `NEXTAUTH_DEV_BYPASS=false` and `GITHUB_WEBHOOK_SKIP_VALIDATION=false`.
4. [ ] **Database Schema Synchronized**: Apply database migrations with `TYPEORM_SYNC=false`.
5. [ ] **Build Verification**: Execute `turbo build` across workspace and ensure zero errors.
6. [ ] **HTTPS/SSL Termination**: Ensure all production endpoints utilize TLS/HTTPS.
