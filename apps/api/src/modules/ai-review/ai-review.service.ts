import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getAIClient } from '@aidevops/ai-client';
import { AIReviewResult } from '../../entities';
import { PolicyEngineService } from '../policy-engine/policy-engine.service';
import type { AIReviewResult as IAIReviewResult } from '@aidevops/shared-types';

@Injectable()
export class AIReviewService {
  private readonly logger = new Logger(AIReviewService.name);

  constructor(
    @InjectRepository(AIReviewResult) private repo: Repository<AIReviewResult>,
    private readonly policyEngineService: PolicyEngineService,
  ) {}

  async reviewDiff(
    pipelineRunId: string,
    diff: string,
    organizationId: string,
    projectId?: string,
    context?: { branch?: string; author?: string; prTitle?: string },
  ): Promise<AIReviewResult> {
    this.logger.log(`Starting AI review for pipeline ${pipelineRunId}`);

    const aiClient = getAIClient({ riskThreshold: 100 }); // We handle threshold in Policy Engine now
    const result = await aiClient.reviewCode(diff, pipelineRunId, context);

    // Evaluate against dynamic policies
    const policy = await this.policyEngineService.evaluate(result as unknown as IAIReviewResult, organizationId, projectId);
    const approved = policy.decision === 'approved';
    const blockedReason = policy.decision !== 'approved' ? policy.reason : undefined;

    const entity = this.repo.create({
      pipelineRunId: result.id,
      provider: result.provider,
      model: result.model,
      riskScore: result.riskScore as unknown as object,
      issues: result.issues as unknown as object[],
      summary: result.summary,
      recommendations: result.recommendations as unknown as object[],
      approved,
      blockedReason,
      tokensUsed: result.tokensUsed,
      costUsd: result.costUsd,
    });

    const saved = await this.repo.save(entity);
    this.logger.log(
      `AI review complete. Risk: ${result.riskScore.overall}/100. Approved: ${result.approved}`,
    );
    return saved;
  }

  async findByPipelineRun(pipelineRunId: string): Promise<AIReviewResult | null> {
    return this.repo.findOne({ where: { pipelineRunId } });
  }

  async findAll(limit = 20): Promise<AIReviewResult[]> {
    return this.repo.find({ order: { createdAt: 'DESC' }, take: limit });
  }

  async getReviewStats() {
    const reviews = await this.repo.find({ take: 100, order: { createdAt: 'DESC' } });
    const approved = reviews.filter((r) => r.approved).length;
    const blocked = reviews.filter((r) => !r.approved).length;
    const totalCost = reviews.reduce((acc, r) => acc + Number(r.costUsd), 0);
    const avgRisk = reviews.reduce(
      (acc, r) => acc + (r.riskScore as { overall: number }).overall, 0,
    ) / (reviews.length || 1);
    return {
      total: reviews.length,
      approved,
      blocked,
      avgRiskScore: Math.round(avgRisk),
      totalCostUsd: totalCost.toFixed(4),
    };
  }

  async reviewInline(code: string, filename: string): Promise<any> {
    this.logger.log(`Inline review requested for ${filename}`);
    const aiClient = getAIClient();
    const prompt = `Analyze this file and return JSON { riskScore, securityScore, qualityScore, performanceScore, maintainabilityScore, summary, issues: [{id, file, line, riskLevel, category, title, description, suggestion}], recommendations: [] }:\n\nFile: ${filename}\n\n\`\`\`\n${code.slice(0, 8000)}\n\`\`\``;
    return aiClient.reviewCode(prompt, 'inline-review');
  }

  async generateCommitMessage(diff: string): Promise<{ message: string }> {
    this.logger.log('Generating commit message');
    const aiClient = getAIClient();
    const message = await aiClient.generateCommitMessage(diff);
    return { message };
  }

  async summarizePR(diff: string, title?: string): Promise<{ summary: string }> {
    this.logger.log('Generating PR summary');
    const aiClient = getAIClient();
    const summary = await aiClient.summarizePR(diff, title);
    return { summary };
  }
}
