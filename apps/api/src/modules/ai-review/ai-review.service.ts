import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getAIClient } from '@aidevops/ai-client';
import { AIReviewResult, CommitEntity, IncidentAlertEntity } from '../../entities';
import { PolicyEngineService } from '../policy-engine/policy-engine.service';
import type { AIReviewResult as IAIReviewResult } from '@aidevops/shared-types';
import Redis from 'ioredis';
import * as crypto from 'crypto';

@Injectable()
export class AIReviewService {
  private readonly logger = new Logger(AIReviewService.name);
  private readonly redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  constructor(
    @InjectRepository(AIReviewResult) private repo: Repository<AIReviewResult>,
    @InjectRepository(CommitEntity) private commitRepo: Repository<CommitEntity>,
    @InjectRepository(IncidentAlertEntity) private incidentRepo: Repository<IncidentAlertEntity>,
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

    const diffHash = crypto.createHash('sha256').update(diff).digest('hex');
    const cacheKey = `org:${organizationId}:ai-cache:review:${diffHash}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.log(`[Cache Hit] Redis match found for diff hash: ${diffHash}`);
        const result = JSON.parse(cached);

        const policy = await this.policyEngineService.evaluate(result as unknown as IAIReviewResult, organizationId, projectId);
        const approved = policy.decision === 'approved';
        const blockedReason = policy.decision !== 'approved' ? policy.reason : undefined;

        const entity = this.repo.create({
          pipelineRunId,
          provider: result.provider,
          model: result.model,
          riskScore: result.riskScore as unknown as object,
          issues: result.issues as unknown as object[],
          summary: result.summary,
          recommendations: result.recommendations as unknown as object[],
          approved,
          blockedReason,
          tokensUsed: 0,
          costUsd: 0,
        });

        const saved = await this.repo.save(entity);
        return saved;
      }
    } catch (err) {
      this.logger.warn(`Redis cache lookup failed: ${err.message}`);
    }

    // Build historical context
    let enrichedContext = '';
    if (projectId) {
      try {
        const recentCommits = await this.commitRepo.find({
          where: { projectId },
          order: { createdAt: 'DESC' },
          take: 5,
        });

        const recentIncidents = await this.incidentRepo.find({
          where: { projectId },
          order: { timestamp: 'DESC' },
          take: 3,
        });

        if (recentCommits.length > 0 || recentIncidents.length > 0) {
          enrichedContext += '\n### Repository Historical Context:\n';
          
          if (recentCommits.length > 0) {
            enrichedContext += '\nRecent Commits:\n';
            recentCommits.forEach((c) => {
              enrichedContext += `- Commit: ${c.sha.slice(0, 7)} | Risk Score: ${c.riskScore ?? 'N/A'} | Message: "${c.message}" | Author: ${c.author}\n`;
            });
          }

          if (recentIncidents.length > 0) {
            enrichedContext += '\nRecent System Incidents & Production Failures:\n';
            recentIncidents.forEach((inc) => {
              enrichedContext += `- Incident: "${inc.title}" | Severity: ${inc.severity} | Description: "${inc.description}"\n`;
            });
          }
        }
      } catch (err) {
        this.logger.warn(`Failed to build historical context: ${err.message}`);
      }
    }

    const finalDiff = enrichedContext 
      ? `${enrichedContext}\n\n### Code Diff under Analysis:\n${diff}`
      : diff;

    const aiClient = getAIClient({ riskThreshold: 100 });
    const result = await aiClient.reviewCode(finalDiff, pipelineRunId, context);

    // Save cache to Redis
    try {
      await this.redis.set(cacheKey, JSON.stringify(result), 'EX', 604800); // 7 days expiration
      this.logger.log(`[Cache Write] Saved review result in Redis for hash: ${diffHash}`);
    } catch (err) {
      this.logger.warn(`Failed to write to Redis cache: ${err.message}`);
    }

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

  async findByPipelineRun(pipelineRunId: string, organizationId: string): Promise<AIReviewResult | null> {
    return this.repo.createQueryBuilder('a')
      .innerJoin('pipeline_runs', 'p', 'a.pipelineRunId = p.id')
      .where('a.pipelineRunId = :pipelineRunId', { pipelineRunId })
      .andWhere('p.organizationId = :organizationId', { organizationId })
      .getOne();
  }

  async findAll(organizationId: string, limit = 20): Promise<AIReviewResult[]> {
    return this.repo.createQueryBuilder('a')
      .innerJoin('pipeline_runs', 'p', 'a.pipelineRunId = p.id')
      .where('p.organizationId = :organizationId', { organizationId })
      .orderBy('a.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }

  async getReviewStats(organizationId: string) {
    const reviews = await this.repo.createQueryBuilder('a')
      .innerJoin('pipeline_runs', 'p', 'a.pipelineRunId = p.id')
      .where('p.organizationId = :organizationId', { organizationId })
      .orderBy('a.createdAt', 'DESC')
      .take(100)
      .getMany();
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
