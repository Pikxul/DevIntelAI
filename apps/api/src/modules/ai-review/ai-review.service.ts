import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getAIClient } from '@aidevops/ai-client';
import { AIReviewResult } from '../../entities';

@Injectable()
export class AIReviewService {
  private readonly logger = new Logger(AIReviewService.name);

  constructor(
    @InjectRepository(AIReviewResult) private repo: Repository<AIReviewResult>,
  ) {}

  async reviewDiff(
    pipelineRunId: string,
    diff: string,
    context?: { branch?: string; author?: string; prTitle?: string },
    riskThreshold = 70,
  ): Promise<AIReviewResult> {
    this.logger.log(`Starting AI review for pipeline ${pipelineRunId}`);

    const aiClient = getAIClient({ riskThreshold });
    const result = await aiClient.reviewCode(diff, pipelineRunId, context);

    const entity = this.repo.create({
      pipelineRunId: result.id,
      provider: result.provider,
      model: result.model,
      riskScore: result.riskScore as unknown as object,
      issues: result.issues as unknown as object[],
      summary: result.summary,
      recommendations: result.recommendations as unknown as object[],
      approved: result.approved,
      blockedReason: result.blockedReason,
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
}
