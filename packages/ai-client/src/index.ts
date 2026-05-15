import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import pRetry from 'p-retry';
import type { AIReviewResult, RiskScore, AnomalyAlert, MetricSnapshot, CodeIssue, RiskLevel } from '@aidevops/shared-types';

// ─── Configuration ────────────────────────────────────────────────────────────

export interface AIClientConfig {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  primaryProvider?: 'openai' | 'anthropic';
  openaiModel?: string;
  anthropicModel?: string;
  maxRetries?: number;
  riskThreshold?: number; // Block pipeline above this score (0-100)
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

const CODE_REVIEW_SYSTEM_PROMPT = `You are a senior software engineer and security expert performing a comprehensive code review.
Analyze the provided git diff and return a JSON response with:
1. A risk score (0-100, higher = riskier)
2. Identified issues categorized by severity and type
3. Specific, actionable recommendations
4. An approval decision based on the risk threshold

Focus on: security vulnerabilities, logic errors, performance issues, code quality, and maintainability.
Always return valid JSON matching the specified schema.`;

const ANOMALY_DETECTION_PROMPT = `You are an SRE (Site Reliability Engineer) AI monitoring production systems.
Analyze the provided metrics snapshot and determine if anomalous behavior is detected.
Return a JSON response indicating anomaly type, severity, description, and rollback recommendation.
Be precise about thresholds and provide actionable remediation steps.`;

// ─── Cost Tracking ────────────────────────────────────────────────────────────

const COST_PER_1K_TOKENS: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
  'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
};

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const rates = COST_PER_1K_TOKENS[model] ?? { input: 0.005, output: 0.015 };
  return (inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output;
}

// ─── Response Parsers ─────────────────────────────────────────────────────────

function parseRiskLevel(score: number): RiskLevel {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  if (score >= 20) return 'low';
  return 'info';
}

function buildReviewResultFromJSON(
  raw: Record<string, unknown>,
  pipelineRunId: string,
  provider: 'openai' | 'anthropic',
  model: string,
  tokensUsed: number,
  costUsd: number,
  riskThreshold: number,
): AIReviewResult {
  const overallScore = typeof raw.riskScore === 'number' ? raw.riskScore : 50;
  const riskScore: RiskScore = {
    overall: overallScore,
    security: typeof raw.securityScore === 'number' ? raw.securityScore : overallScore,
    quality: typeof raw.qualityScore === 'number' ? raw.qualityScore : overallScore,
    performance: typeof raw.performanceScore === 'number' ? raw.performanceScore : overallScore,
    maintainability: typeof raw.maintainabilityScore === 'number' ? raw.maintainabilityScore : overallScore,
    level: parseRiskLevel(overallScore),
    summary: typeof raw.summary === 'string' ? raw.summary : 'AI review complete.',
  };

  const issues: CodeIssue[] = Array.isArray(raw.issues)
    ? (raw.issues as CodeIssue[])
    : [];

  const recommendations: string[] = Array.isArray(raw.recommendations)
    ? (raw.recommendations as string[])
    : [];

  const approved = overallScore < riskThreshold;

  return {
    id: crypto.randomUUID(),
    pipelineRunId,
    provider,
    model,
    riskScore,
    issues,
    summary: riskScore.summary,
    recommendations,
    approved,
    blockedReason: approved
      ? undefined
      : `Risk score ${overallScore} exceeds threshold ${riskThreshold}`,
    tokensUsed,
    costUsd,
    createdAt: new Date().toISOString(),
  };
}

// ─── Main AI Client ───────────────────────────────────────────────────────────

export class AIClient {
  private openai?: OpenAI;
  private anthropic?: Anthropic;
  private config: Required<AIClientConfig>;

  constructor(config: AIClientConfig = {}) {
    this.config = {
      openaiApiKey: config.openaiApiKey ?? process.env.OPENAI_API_KEY ?? '',
      anthropicApiKey: config.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY ?? '',
      primaryProvider: config.primaryProvider ?? 'openai',
      openaiModel: config.openaiModel ?? process.env.AI_MODEL_OPENAI ?? 'gpt-4o',
      anthropicModel: config.anthropicModel ?? process.env.AI_MODEL_ANTHROPIC ?? 'claude-3-5-sonnet-20241022',
      maxRetries: config.maxRetries ?? 3,
      riskThreshold: config.riskThreshold ?? 70,
    };

    if (this.config.openaiApiKey) {
      this.openai = new OpenAI({ apiKey: this.config.openaiApiKey });
    }
    if (this.config.anthropicApiKey) {
      this.anthropic = new Anthropic({ apiKey: this.config.anthropicApiKey });
    }
  }

  // ─── Code Review ────────────────────────────────────────────────────────────

  async reviewCode(
    diff: string,
    pipelineRunId: string,
    context?: { branch?: string; author?: string; prTitle?: string },
  ): Promise<AIReviewResult> {
    const contextBlock = context
      ? `\nContext:\n- Branch: ${context.branch ?? 'unknown'}\n- Author: ${context.author ?? 'unknown'}\n- PR: ${context.prTitle ?? 'N/A'}`
      : '';

    const userPrompt = `${contextBlock}\n\nAnalyze this git diff and return JSON:\n\n\`\`\`diff\n${diff}\n\`\`\`\n\nReturn JSON with: { riskScore, securityScore, qualityScore, performanceScore, maintainabilityScore, summary, issues: [{id, file, line, riskLevel, category, title, description, suggestion}], recommendations: [] }`;

    return pRetry(
      async () => {
        if (this.config.primaryProvider === 'openai' && this.openai) {
          return this.reviewWithOpenAI(userPrompt, pipelineRunId);
        } else if (this.anthropic) {
          return this.reviewWithAnthropic(userPrompt, pipelineRunId);
        }
        throw new Error('No AI provider configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.');
      },
      {
        retries: this.config.maxRetries,
        onFailedAttempt: (err) => {
          console.warn(`AI review attempt ${err.attemptNumber} failed. Retrying...`);
          // On primary failure, switch to fallback
          if (err.attemptNumber === 1 && this.config.primaryProvider === 'openai' && this.anthropic) {
            console.log('Falling back to Anthropic Claude...');
          }
        },
      },
    );
  }

  private async reviewWithOpenAI(prompt: string, pipelineRunId: string): Promise<AIReviewResult> {
    if (!this.openai) throw new Error('OpenAI not configured');
    const response = await this.openai.chat.completions.create({
      model: this.config.openaiModel,
      messages: [
        { role: 'system', content: CODE_REVIEW_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content ?? '{}';
    const raw = JSON.parse(content) as Record<string, unknown>;
    const inputTokens = response.usage?.prompt_tokens ?? 0;
    const outputTokens = response.usage?.completion_tokens ?? 0;
    const tokensUsed = inputTokens + outputTokens;
    const costUsd = calculateCost(this.config.openaiModel, inputTokens, outputTokens);

    return buildReviewResultFromJSON(
      raw, pipelineRunId, 'openai', this.config.openaiModel,
      tokensUsed, costUsd, this.config.riskThreshold,
    );
  }

  private async reviewWithAnthropic(prompt: string, pipelineRunId: string): Promise<AIReviewResult> {
    if (!this.anthropic) throw new Error('Anthropic not configured');
    const response = await this.anthropic.messages.create({
      model: this.config.anthropicModel,
      max_tokens: 4096,
      system: CODE_REVIEW_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    const text = content.type === 'text' ? content.text : '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const raw = jsonMatch ? (JSON.parse(jsonMatch[0]) as Record<string, unknown>) : {};
    const tokensUsed = (response.usage.input_tokens ?? 0) + (response.usage.output_tokens ?? 0);
    const costUsd = calculateCost(
      this.config.anthropicModel,
      response.usage.input_tokens ?? 0,
      response.usage.output_tokens ?? 0,
    );

    return buildReviewResultFromJSON(
      raw, pipelineRunId, 'anthropic', this.config.anthropicModel,
      tokensUsed, costUsd, this.config.riskThreshold,
    );
  }

  // ─── Risk Analysis (for VS Code extension, single file) ────────────────────

  async analyzeRisk(fileContent: string, filename: string): Promise<RiskScore> {
    const prompt = `Analyze this file for risks and return JSON { riskScore, securityScore, qualityScore, performanceScore, maintainabilityScore, summary }:\n\nFile: ${filename}\n\n\`\`\`\n${fileContent.slice(0, 8000)}\n\`\`\``;

    const fakeResult = await this.reviewCode(prompt, 'inline', { branch: 'local' });
    return fakeResult.riskScore;
  }

  // ─── Anomaly Detection ──────────────────────────────────────────────────────

  async detectAnomaly(
    metrics: MetricSnapshot,
    deploymentId: string,
    baseline?: Partial<MetricSnapshot>,
  ): Promise<AnomalyAlert | null> {
    const prompt = `Analyze these production metrics and determine if anomalous behavior exists.
Current metrics: ${JSON.stringify(metrics, null, 2)}
${baseline ? `Baseline: ${JSON.stringify(baseline, null, 2)}` : ''}

Return JSON: { anomalyDetected: boolean, type?: string, severity?: string, title?: string, description?: string, metric?: string, currentValue?: number, expectedMin?: number, expectedMax?: number, confidence?: number, recommendation?: string }`;

    try {
      const result = await pRetry(
        async () => {
          if (this.openai) {
            const response = await this.openai.chat.completions.create({
              model: this.config.openaiModel,
              messages: [
                { role: 'system', content: ANOMALY_DETECTION_PROMPT },
                { role: 'user', content: prompt },
              ],
              response_format: { type: 'json_object' },
              temperature: 0.1,
            });
            return JSON.parse(response.choices[0]?.message?.content ?? '{}') as Record<string, unknown>;
          }
          throw new Error('No provider available');
        },
        { retries: 2 },
      );

      if (!result.anomalyDetected) return null;

      return {
        id: crypto.randomUUID(),
        deploymentId,
        type: (result.type as AnomalyAlert['type']) ?? 'custom',
        severity: (result.severity as AnomalyAlert['severity']) ?? 'medium',
        title: (result.title as string) ?? 'Anomaly Detected',
        description: (result.description as string) ?? '',
        metric: (result.metric as string) ?? 'unknown',
        currentValue: (result.currentValue as number) ?? 0,
        expectedRange: {
          min: (result.expectedMin as number) ?? 0,
          max: (result.expectedMax as number) ?? 100,
        },
        confidence: (result.confidence as number) ?? 0.8,
        recommendation: (result.recommendation as string) ?? 'Investigate and consider rollback.',
        autoRollbackTriggered: false,
        detectedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.error('Anomaly detection error:', err);
      return null;
    }
  }

  // ─── Health Check ───────────────────────────────────────────────────────────

  async healthCheck(): Promise<{ openai: boolean; anthropic: boolean }> {
    const results = { openai: false, anthropic: false };

    if (this.openai) {
      try {
        await this.openai.models.list();
        results.openai = true;
      } catch { /* silent */ }
    }

    if (this.anthropic) {
      try {
        await this.anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 5,
          messages: [{ role: 'user', content: 'ping' }],
        });
        results.anthropic = true;
      } catch { /* silent */ }
    }

    return results;
  }
}

// ─── Singleton factory ────────────────────────────────────────────────────────

let _instance: AIClient | null = null;

export function getAIClient(config?: AIClientConfig): AIClient {
  if (!_instance) {
    _instance = new AIClient(config);
  }
  return _instance;
}

export { AIReviewResult, RiskScore, AnomalyAlert, MetricSnapshot };
