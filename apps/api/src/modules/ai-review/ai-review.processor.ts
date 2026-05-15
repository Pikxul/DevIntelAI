import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { AIReviewService } from './ai-review.service';
import { PipelinesService } from '../pipelines/pipelines.service';

@Processor('pipeline')
export class AIReviewProcessor {
  private readonly logger = new Logger(AIReviewProcessor.name);

  constructor(
    private readonly aiReviewService: AIReviewService,
    private readonly pipelinesService: PipelinesService,
  ) {}

  @Process('start')
  async handlePipelineStart(job: Job<{ pipelineRunId: string; diff?: string }>) {
    const { pipelineRunId, diff } = job.data;
    this.logger.log(`Processing pipeline ${pipelineRunId}`);

    // Mark AI review as running
    await this.pipelinesService.updateStage(pipelineRunId, 'ai_review', 'running');

    if (!diff || diff.trim().length === 0) {
      this.logger.warn(`No diff provided for pipeline ${pipelineRunId}, skipping AI review`);
      await this.pipelinesService.updateStage(pipelineRunId, 'ai_review', 'skipped', 'No diff content');
      return;
    }

    try {
      const result = await this.aiReviewService.reviewDiff(pipelineRunId, diff);

      if (result.approved) {
        await this.pipelinesService.updateStage(
          pipelineRunId, 'ai_review', 'success',
          `✅ Risk score: ${(result.riskScore as { overall: number }).overall}/100 — Approved`,
        );
      } else {
        await this.pipelinesService.updateStage(
          pipelineRunId, 'ai_review', 'blocked',
          `🚫 Risk score: ${(result.riskScore as { overall: number }).overall}/100 — ${result.blockedReason}`,
        );
        await this.pipelinesService.updateStatus(pipelineRunId, 'failed');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`AI review failed for pipeline ${pipelineRunId}: ${msg}`);
      await this.pipelinesService.updateStage(pipelineRunId, 'ai_review', 'failed', msg);
    }
  }
}
