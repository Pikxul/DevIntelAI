import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import pRetry from 'p-retry';
import type { AIReviewResult, RiskScore, AnomalyAlert, MetricSnapshot, CodeIssue, RiskLevel, SecurityScanResult, SecurityFinding } from '@aidevops/shared-types';

// ─── Configuration ────────────────────────────────────────────────────────────

export interface AIClientConfig {
  geminiApiKey?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  primaryProvider?: 'gemini' | 'anthropic' | 'openai';
  geminiModel?: string;
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

const COMMIT_MESSAGE_PROMPT = `You are an expert software engineer.
Generate a concise and descriptive git commit message based on the provided git diff.
Follow conventional commits format. Return a JSON response with a single "message" field.`;

const PR_SUMMARY_PROMPT = `You are an expert technical writer and senior software engineer.
Analyze the provided git diff and PR title, and generate a comprehensive Pull Request summary.
Return a JSON response with a single "summary" field formatted in Markdown.`;

const SECURITY_SCAN_SYSTEM_PROMPT = `You are a cybersecurity expert and senior site reliability engineer.
Perform a dedicated static application security testing (SAST) review of the provided code diff.
Identify vulnerabilities including OWASP Top 10, SQL injection, XSS, CSRF, insecure dependencies, hardcoded credentials, buffer overflows, path traversal, authorization bypass.
Always return valid JSON matching the specified security scan schema.`;

// ─── Cost Tracking ────────────────────────────────────────────────────────────

const COST_PER_1K_TOKENS: Record<string, { input: number; output: number }> = {
  // Gemini (Google) — primary
  'gemini-2.0-flash': { input: 0.0001, output: 0.0004 },
  'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
  'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
  // OpenAI
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  // Anthropic
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
  provider: 'openai' | 'anthropic' | 'gemini',
  model: string,
  tokensUsed: number,
  costUsd: number,
  riskThreshold: number,
): AIReviewResult {
  const overallScore = typeof raw.riskScore === 'number' ? raw.riskScore : 50;
  const dynamicConfidence = typeof raw.confidence === 'number' ? raw.confidence : Math.max(40, 100 - overallScore);
  const rawIssues = Array.isArray(raw.issues) ? raw.issues : [];
  const evidence: string[] = Array.isArray(raw.evidence)
    ? (raw.evidence as string[])
    : rawIssues.map((i: any) => `${i.category ?? 'logic'}: ${i.title || i.description || 'Code issue'}`);

  const riskScore: RiskScore = {
    overall: overallScore,
    security: typeof raw.securityScore === 'number' ? raw.securityScore : overallScore,
    quality: typeof raw.qualityScore === 'number' ? raw.qualityScore : overallScore,
    performance: typeof raw.performanceScore === 'number' ? raw.performanceScore : overallScore,
    maintainability: typeof raw.maintainabilityScore === 'number' ? raw.maintainabilityScore : overallScore,
    level: parseRiskLevel(overallScore),
    summary: typeof raw.summary === 'string' ? raw.summary : 'AI review complete.',
    confidence: dynamicConfidence,
    evidence,
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
  private gemini?: GoogleGenerativeAI;
  private openai?: OpenAI;
  private anthropic?: Anthropic;
  private config: Required<AIClientConfig>;
  private geminiRateLimitResetTime: number | null = null;
  private anthropicRateLimitResetTime: number | null = null;

  constructor(config: AIClientConfig = {}) {
    this.config = {
      geminiApiKey: config.geminiApiKey ?? process.env.GEMINI_API_KEY ?? '',
      openaiApiKey: config.openaiApiKey ?? process.env.OPENAI_API_KEY ?? '',
      anthropicApiKey: config.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY ?? '',
      primaryProvider: (config.primaryProvider ?? process.env.AI_PRIMARY_PROVIDER ?? 'gemini') as 'gemini' | 'anthropic' | 'openai',
      geminiModel: config.geminiModel ?? process.env.AI_MODEL_GEMINI ?? 'gemini-2.0-flash',
      openaiModel: config.openaiModel ?? process.env.AI_MODEL_OPENAI ?? 'gpt-4o',
      anthropicModel: config.anthropicModel ?? process.env.AI_MODEL_ANTHROPIC ?? 'claude-3-5-sonnet-20241022',
      maxRetries: config.maxRetries ?? 3,
      riskThreshold: config.riskThreshold ?? 70,
    };

    if (this.config.geminiApiKey) {
      this.gemini = new GoogleGenerativeAI(this.config.geminiApiKey);
    }
    if (this.config.openaiApiKey) {
      this.openai = new OpenAI({ apiKey: this.config.openaiApiKey });
    }
    if (this.config.anthropicApiKey) {
      this.anthropic = new Anthropic({ apiKey: this.config.anthropicApiKey });
    }
  }

  // ─── Gemini helper ────────────────────────────────────────────────────────────

  private async callGemini(
    systemPrompt: string,
    userPrompt: string,
    expectJson = false,
  ): Promise<{ text: string; usage?: { promptTokens: number; completionTokens: number } }> {
    if (!this.gemini) throw new Error('Gemini not configured');
    const model = this.gemini.getGenerativeModel({
      model: this.config.geminiModel,
      systemInstruction: systemPrompt,
      generationConfig: expectJson ? { responseMimeType: 'application/json' } : undefined,
    });
    const result = await model.generateContent(userPrompt);
    const text = result.response.text();
    const usage = result.response.usageMetadata
      ? {
          promptTokens: result.response.usageMetadata.promptTokenCount ?? 0,
          completionTokens: result.response.usageMetadata.candidatesTokenCount ?? 0,
        }
      : undefined;
    return { text, usage };
  }

  // ─── Fallback chain respecting AI_PRIMARY_PROVIDER ───────────────────────────

  private async executeWithFallback<T>(
    geminiCall: () => Promise<T>,
    anthropicCall: () => Promise<T>,
    openaiCall: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const providers = ['gemini', 'anthropic', 'openai'];
    const primary = this.config.primaryProvider;
    
    // Sort providers so that the primary is tried first
    const executionOrder = [
      primary,
      ...providers.filter(p => p !== primary)
    ];

    const errors: Error[] = [];

    for (const provider of executionOrder) {
      if (provider === 'gemini' && this.gemini) {
        const isGeminiCoolingDown = this.geminiRateLimitResetTime && Date.now() < this.geminiRateLimitResetTime;
        if (!isGeminiCoolingDown) {
          try {
            const result = await geminiCall();
            this.geminiRateLimitResetTime = null;
            return result;
          } catch (err: any) {
            console.warn(`[${operationName}] Gemini error: ${err.message}. Falling back.`);
            if (err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('quota')) {
              this.geminiRateLimitResetTime = Date.now() + 60000;
            }
            errors.push(err);
          }
        }
      }

      if (provider === 'anthropic' && this.anthropic) {
        const isAnthropicCoolingDown = this.anthropicRateLimitResetTime && Date.now() < this.anthropicRateLimitResetTime;
        if (!isAnthropicCoolingDown) {
          try {
            const result = await anthropicCall();
            this.anthropicRateLimitResetTime = null;
            return result;
          } catch (err: any) {
            console.warn(`[${operationName}] Anthropic error: ${err.message}. Falling back.`);
            if (err?.status === 429 || err?.message?.includes('429') || err?.status === 402) {
              this.anthropicRateLimitResetTime = Date.now() + 60000;
            }
            errors.push(err);
          }
        }
      }

      if (provider === 'openai' && this.openai) {
        try {
          const result = await openaiCall();
          return result;
        } catch (err: any) {
          console.warn(`[${operationName}] OpenAI error: ${err.message}. Falling back.`);
          errors.push(err);
        }
      }
    }

    throw new Error(`[${operationName}] All configured AI providers failed. Errors: ${errors.map(e => e.message).join(' | ')}`);
  }

  // ─── Code Review ─────────────────────────────────────────────────────────────

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
        return this.executeWithFallback(
          () => this.reviewWithGemini(userPrompt, pipelineRunId),
          () => this.reviewWithAnthropic(userPrompt, pipelineRunId),
          () => this.reviewWithOpenAI(userPrompt, pipelineRunId),
          'reviewCode'
        );
      },
      { retries: this.config.maxRetries },
    );
  }

  private async reviewWithGemini(prompt: string, pipelineRunId: string): Promise<AIReviewResult> {
    const { text, usage } = await this.callGemini(CODE_REVIEW_SYSTEM_PROMPT, prompt, true);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const raw = jsonMatch ? (JSON.parse(jsonMatch[0]) as Record<string, unknown>) : {};
    const inputTokens = usage?.promptTokens ?? 0;
    const outputTokens = usage?.completionTokens ?? 0;
    const tokensUsed = inputTokens + outputTokens;
    const costUsd = calculateCost(this.config.geminiModel, inputTokens, outputTokens);
    return buildReviewResultFromJSON(
      raw, pipelineRunId, 'gemini', this.config.geminiModel,
      tokensUsed, costUsd, this.config.riskThreshold,
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

  // ─── Risk Analysis (for VS Code extension, single file) ──────────────────────

  async analyzeRisk(fileContent: string, filename: string): Promise<RiskScore> {
    const prompt = `Analyze this file for risks and return JSON { riskScore, securityScore, qualityScore, performanceScore, maintainabilityScore, summary }:\n\nFile: ${filename}\n\n\`\`\`\n${fileContent.slice(0, 8000)}\n\`\`\``;

    const fakeResult = await this.reviewCode(prompt, 'inline', { branch: 'local' });
    return fakeResult.riskScore;
  }

  // ─── Anomaly Detection ────────────────────────────────────────────────────────

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
          return this.executeWithFallback(
            async () => {
              const { text } = await this.callGemini(ANOMALY_DETECTION_PROMPT, prompt, true);
              const jsonMatch = text.match(/\{[\s\S]*\}/);
              return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
            },
            async () => {
              if (!this.anthropic) throw new Error('Anthropic not configured');
              const res = await this.anthropic.messages.create({
                model: this.config.anthropicModel,
                max_tokens: 1024,
                system: ANOMALY_DETECTION_PROMPT,
                messages: [{ role: 'user', content: prompt }]
              });
              const content = res.content[0];
              const text = content.type === 'text' ? content.text : '{}';
              const jsonMatch = text.match(/\{[\s\S]*\}/);
              return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
            },
            async () => {
              if (!this.openai) throw new Error('OpenAI not configured');
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
            },
            'detectAnomaly'
          );
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

  // ─── Generative AI ────────────────────────────────────────────────────────────

  async generateCommitMessage(diff: string): Promise<string> {
    const prompt = `Analyze this git diff and generate a commit message.\n\n\`\`\`diff\n${diff.slice(0, 8000)}\n\`\`\``;

    return pRetry(
      async () => {
        return this.executeWithFallback(
          async () => {
            const { text } = await this.callGemini(COMMIT_MESSAGE_PROMPT, prompt, true);
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const content = jsonMatch ? JSON.parse(jsonMatch[0]) : { message: 'Update code' };
            return content.message as string;
          },
          async () => {
            if (!this.anthropic) throw new Error('Anthropic not configured');
            const res = await this.anthropic.messages.create({
              model: this.config.anthropicModel,
              max_tokens: 500,
              system: COMMIT_MESSAGE_PROMPT,
              messages: [{ role: 'user', content: prompt }]
            });
            const text = res.content[0].type === 'text' ? res.content[0].text : '{"message": "Update code"}';
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const content = jsonMatch ? JSON.parse(jsonMatch[0]) : { message: 'Update code' };
            return content.message as string;
          },
          async () => {
            if (!this.openai) throw new Error('OpenAI not configured');
            const response = await this.openai.chat.completions.create({
              model: this.config.openaiModel,
              messages: [
                { role: 'system', content: COMMIT_MESSAGE_PROMPT },
                { role: 'user', content: prompt },
              ],
              response_format: { type: 'json_object' },
              temperature: 0.3,
            });
            const content = JSON.parse(response.choices[0]?.message?.content ?? '{"message": "Update code"}');
            return content.message as string;
          },
          'generateCommitMessage'
        );
      },
      { retries: 2 },
    );
  }

  async summarizePR(diff: string, title?: string): Promise<string> {
    const context = title ? `PR Title: ${title}\n\n` : '';
    const prompt = `${context}Analyze this git diff and generate a markdown PR summary.\n\n\`\`\`diff\n${diff.slice(0, 15000)}\n\`\`\``;

    return pRetry(
      async () => {
        return this.executeWithFallback(
          async () => {
            const { text } = await this.callGemini(PR_SUMMARY_PROMPT, prompt, true);
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const content = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: 'PR Summary unavailable' };
            return content.summary as string;
          },
          async () => {
            if (!this.anthropic) throw new Error('Anthropic not configured');
            const res = await this.anthropic.messages.create({
              model: this.config.anthropicModel,
              max_tokens: 1500,
              system: PR_SUMMARY_PROMPT,
              messages: [{ role: 'user', content: prompt }]
            });
            const text = res.content[0].type === 'text' ? res.content[0].text : '{"summary": "PR Summary unavailable"}';
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const content = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: 'PR Summary unavailable' };
            return content.summary as string;
          },
          async () => {
            if (!this.openai) throw new Error('OpenAI not configured');
            const response = await this.openai.chat.completions.create({
              model: this.config.openaiModel,
              messages: [
                { role: 'system', content: PR_SUMMARY_PROMPT },
                { role: 'user', content: prompt },
              ],
              response_format: { type: 'json_object' },
              temperature: 0.2,
            });
            const content = JSON.parse(response.choices[0]?.message?.content ?? '{"summary": "PR Summary unavailable"}');
            return content.summary as string;
          },
          'summarizePR'
        );
      },
      { retries: 2 },
    );
  }

  // ─── Incident Intelligence ────────────────────────────────────────────────────

  async generateRCA(incident: any): Promise<any> {
    const prompt = `You are a Site Reliability Engineer (SRE).
Analyze the following incident alert and provide a Root Cause Analysis (RCA).
Incident Details: ${JSON.stringify(incident, null, 2)}

Return JSON with: { summary: string, hypothesis: string, rootCause: string, affectedComponents: string[], recommendedActions: string[], confidenceScore: number }`;

    return pRetry(
      async () => {
        return this.executeWithFallback(
          async () => {
            const { text } = await this.callGemini('You are an SRE AI assistant.', prompt, true);
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const content = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
            return {
              summary: content.summary ?? 'N/A',
              hypothesis: content.hypothesis ?? 'N/A',
              rootCause: content.rootCause ?? 'N/A',
              affectedComponents: Array.isArray(content.affectedComponents) ? content.affectedComponents : [],
              recommendedActions: Array.isArray(content.recommendedActions) ? content.recommendedActions : [],
              confidenceScore: typeof content.confidenceScore === 'number' ? content.confidenceScore : 50,
            };
          },
          async () => {
            if (!this.anthropic) throw new Error('Anthropic not configured');
            const res = await this.anthropic.messages.create({
              model: this.config.anthropicModel,
              max_tokens: 1500,
              system: 'You are an SRE AI assistant.',
              messages: [{ role: 'user', content: prompt }]
            });
            const text = res.content[0].type === 'text' ? res.content[0].text : '{}';
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const content = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
            return {
              summary: content.summary ?? 'N/A',
              hypothesis: content.hypothesis ?? 'N/A',
              rootCause: content.rootCause ?? 'N/A',
              affectedComponents: Array.isArray(content.affectedComponents) ? content.affectedComponents : [],
              recommendedActions: Array.isArray(content.recommendedActions) ? content.recommendedActions : [],
              confidenceScore: typeof content.confidenceScore === 'number' ? content.confidenceScore : 50,
            };
          },
          async () => {
            if (!this.openai) throw new Error('OpenAI not configured');
            const response = await this.openai.chat.completions.create({
              model: this.config.openaiModel,
              messages: [
                { role: 'system', content: 'You are an SRE AI assistant.' },
                { role: 'user', content: prompt },
              ],
              response_format: { type: 'json_object' },
              temperature: 0.2,
            });
            const content = JSON.parse(response.choices[0]?.message?.content ?? '{}');
            return {
              summary: content.summary ?? 'N/A',
              hypothesis: content.hypothesis ?? 'N/A',
              rootCause: content.rootCause ?? 'N/A',
              affectedComponents: Array.isArray(content.affectedComponents) ? content.affectedComponents : [],
              recommendedActions: Array.isArray(content.recommendedActions) ? content.recommendedActions : [],
              confidenceScore: typeof content.confidenceScore === 'number' ? content.confidenceScore : 50,
            };
          },
          'generateRCA'
        );
      },
      { retries: 2 },
    );
  }

  // ─── Security Review Pass ───────────────────────────────────────────────────

  async scanSecurity(
    diff: string,
    pipelineRunId: string,
  ): Promise<SecurityScanResult> {
    const userPrompt = `Analyze this code diff specifically for security vulnerabilities and return JSON matching the security scan schema:
    
\`\`\`diff
${diff}
\`\`\`

Return JSON format:
{
  "securityRiskScore": number,
  "findings": [
    {
      "id": string,
      "tool": "semgrep",
      "severity": "critical" | "high" | "medium" | "low",
      "ruleId": string,
      "title": string,
      "description": string,
      "file": string,
      "line": number,
      "cve": string,
      "cvss": number,
      "fixAvailable": boolean,
      "fixDescription": string
    }
  ],
  "passed": boolean
}`;

    return pRetry(
      async () => {
        return this.executeWithFallback(
          async () => {
            const { text } = await this.callGemini(SECURITY_SCAN_SYSTEM_PROMPT, userPrompt, true);
            return this.parseSecurityResult(text, pipelineRunId);
          },
          async () => {
            if (!this.anthropic) throw new Error('Anthropic not configured');
            const res = await this.anthropic.messages.create({
              model: this.config.anthropicModel,
              max_tokens: 4096,
              system: SECURITY_SCAN_SYSTEM_PROMPT,
              messages: [{ role: 'user', content: userPrompt }],
            });
            const content = res.content[0];
            const text = content.type === 'text' ? content.text : '{}';
            return this.parseSecurityResult(text, pipelineRunId);
          },
          async () => {
            if (!this.openai) throw new Error('OpenAI not configured');
            const response = await this.openai.chat.completions.create({
              model: this.config.openaiModel,
              messages: [
                { role: 'system', content: SECURITY_SCAN_SYSTEM_PROMPT },
                { role: 'user', content: userPrompt },
              ],
              response_format: { type: 'json_object' },
              temperature: 0.1,
            });
            const content = response.choices[0]?.message?.content ?? '{}';
            return this.parseSecurityResult(content, pipelineRunId);
          },
          'scanSecurity'
        );
      },
      { retries: this.config.maxRetries },
    );
  }

  private parseSecurityResult(text: string, pipelineRunId: string): SecurityScanResult {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const raw = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    const findings = Array.isArray(raw.findings) ? raw.findings : [];
    
    const criticalCount = findings.filter((f: any) => f.severity === 'critical').length;
    const highCount = findings.filter((f: any) => f.severity === 'high').length;
    const mediumCount = findings.filter((f: any) => f.severity === 'medium').length;
    const lowCount = findings.filter((f: any) => f.severity === 'low').length;

    return {
      id: crypto.randomUUID(),
      pipelineRunId,
      tool: 'AI Security Pass',
      findings: findings.map((f: any) => ({
        id: f.id || crypto.randomUUID(),
        tool: f.tool || 'eslint',
        severity: f.severity || 'medium',
        ruleId: f.ruleId || 'security-general',
        title: f.title || 'Insecure Pattern',
        description: f.description || 'Suspicious coding pattern detected by AI scan.',
        file: f.file || 'unknown',
        line: typeof f.line === 'number' ? f.line : 1,
        cve: f.cve,
        cvss: typeof f.cvss === 'number' ? f.cvss : undefined,
        fixAvailable: typeof f.fixAvailable === 'boolean' ? f.fixAvailable : false,
        fixDescription: f.fixDescription,
      })),
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      passed: typeof raw.passed === 'boolean' ? raw.passed : (criticalCount === 0 && highCount === 0),
      scannedAt: new Date().toISOString(),
    };
  }

  // ─── Health Check ─────────────────────────────────────────────────────────────

  async healthCheck(): Promise<{ gemini: boolean; openai: boolean; anthropic: boolean }> {
    const results = { gemini: false, openai: false, anthropic: false };

    if (this.gemini) {
      try {
        const model = this.gemini.getGenerativeModel({ model: this.config.geminiModel });
        await model.generateContent('ping');
        results.gemini = true;
      } catch { /* silent */ }
    }

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
