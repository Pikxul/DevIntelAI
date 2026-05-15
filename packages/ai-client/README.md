# 🤖 `@aidevops/ai-client`

Unified AI client for the AI DevOps platform. Provides a single interface over **OpenAI GPT-4o** (primary) and **Anthropic Claude 3.5 Sonnet** (fallback) with retry logic, cost tracking, and purpose-built prompts.

## Installation

This is an internal workspace package. Import directly in other packages:

```typescript
import { AIClient, type AIReviewResult } from '@aidevops/ai-client';
```

---

## Usage

### Initialize

```typescript
const client = new AIClient({
  openaiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  primaryProvider: 'openai',  // fallback: 'anthropic'
  maxRetries: 3,
});
```

### Code Review

```typescript
const result: AIReviewResult = await client.reviewCode({
  diff: gitDiff,          // git diff string
  filename: 'auth.ts',
  context: 'Pull request: add OAuth support',
});

console.log(result.riskScore.overall);  // 0–100
console.log(result.approved);           // boolean
console.log(result.issues);             // CodeIssue[]
console.log(result.costUsd);            // e.g. 0.00312
```

### Risk Analysis (single file)

```typescript
const risk = await client.analyzeRisk({
  code: fileContents,
  filename: 'database.ts',
});

console.log(risk.level);    // 'low' | 'medium' | 'high' | 'critical'
console.log(risk.security); // 0–100
console.log(risk.quality);  // 0–100
```

### Anomaly Detection

```typescript
const anomaly = await client.detectAnomaly({
  metrics: {
    errorRate: 0.12,
    latencyP99: 4200,
    cpuPercent: 87,
  },
  baseline: { errorRate: 0.01, latencyP99: 800 },
  service: 'api-service',
});

if (anomaly) {
  console.log(anomaly.severity);    // 'critical' | 'warning'
  console.log(anomaly.rootCause);   // AI-generated explanation
  console.log(anomaly.recommendation); // Suggested action
}
```

---

## API Reference

### `AIClient`

#### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `openaiApiKey` | `string` | — | OpenAI API key |
| `anthropicApiKey` | `string` | — | Anthropic API key (optional) |
| `primaryProvider` | `'openai' \| 'anthropic'` | `'openai'` | Which provider to try first |
| `maxRetries` | `number` | `3` | Retry attempts on transient failure |
| `timeout` | `number` | `60000` | Request timeout in ms |

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `reviewCode(opts)` | `Promise<AIReviewResult>` | Full code review with risk score |
| `analyzeRisk(opts)` | `Promise<RiskScore>` | Risk-only analysis (cheaper) |
| `detectAnomaly(opts)` | `Promise<AnomalyAlert \| null>` | Production anomaly detection |
| `getUsageStats()` | `UsageStats` | Cumulative token + cost stats |

---

## Provider Strategy

```
Request
  │
  ▼
OpenAI GPT-4o (primary)
  │ fails? (timeout, rate limit, 5xx)
  ▼
Claude 3.5 Sonnet (fallback)
  │ fails?
  ▼
Throw AIClientError
```

Retries use **exponential backoff** with jitter via `p-retry`.

---

## Cost Tracking

Every call logs:

```typescript
{
  provider: 'openai',
  model: 'gpt-4o',
  promptTokens: 1842,
  completionTokens: 612,
  totalTokens: 2454,
  costUsd: 0.00245
}
```

Retrieve session totals:

```typescript
const stats = client.getUsageStats();
// { totalRequests: 42, totalTokens: 103291, totalCostUsd: 0.103 }
```

---

## Building

```bash
powershell -ExecutionPolicy Bypass -Command "pnpm --filter @aidevops/ai-client build"
```

Output goes to `packages/ai-client/dist/`.
