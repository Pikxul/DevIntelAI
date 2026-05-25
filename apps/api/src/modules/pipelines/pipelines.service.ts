import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PipelineRun } from '../../entities';
import type { PipelineStage, PipelineStageName, StageStatus } from '@aidevops/shared-types';
import { v4 as uuid } from 'uuid';

export interface CreatePipelineRunDto {
  projectId: string;
  organizationId: string;
  commitSha: string;
  branch: string;
  author: string;
  message?: string;
  prNumber?: number;
  prUrl?: string;
  triggeredBy?: 'push' | 'pull_request' | 'manual' | 'schedule';
  diff?: string;
}

const STAGE_NAMES: PipelineStageName[] = [
  'code_push', 'ai_review', 'static_analysis', 'security_scan',
  'unit_tests', 'build', 'containerize', 'push_artifact', 'deploy', 'notify',
];

@Injectable()
export class PipelinesService {
  constructor(
    @InjectRepository(PipelineRun) private repo: Repository<PipelineRun>,
    @InjectQueue('pipeline') private pipelineQueue: Queue,
  ) {}

  async create(dto: CreatePipelineRunDto): Promise<PipelineRun> {
    const stages: PipelineStage[] = STAGE_NAMES.map((name) => ({
      id: uuid(),
      name,
      status: 'pending' as StageStatus,
    }));

    const run = this.repo.create({
      ...dto,
      status: 'running',
      stages,
      triggeredBy: dto.triggeredBy ?? 'push',
    });
    const saved = await this.repo.save(run);

    // Enqueue for full CI/CD processing
    await this.pipelineQueue.add(
      'start',
      {
        pipelineRunId: saved.id,
        diff: dto.diff,
        organizationId: dto.organizationId,
        projectId: dto.projectId,
        branch: dto.branch,
        author: dto.author,
        commitSha: dto.commitSha,
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );

    return saved;

  }

  async findAll(organizationId: string, projectId?: string): Promise<PipelineRun[]> {
    const where: Partial<PipelineRun> = { organizationId };
    if (projectId) where.projectId = projectId;
    return this.repo.find({ where, order: { createdAt: 'DESC' }, take: 50 });
  }

  async findOne(id: string): Promise<PipelineRun | null> {
    return this.repo.findOne({ where: { id } });
  }

  async updateStage(
    pipelineRunId: string,
    stageName: PipelineStageName,
    status: StageStatus,
    log?: string,
  ): Promise<void> {
    const run = await this.repo.findOne({ where: { id: pipelineRunId } });
    if (!run) return;

    const stages = run.stages as unknown as PipelineStage[];
    const stage = stages.find((s) => s.name === stageName);
    if (stage) {
      stage.status = status;
      if (status === 'running' && !stage.startedAt) stage.startedAt = new Date().toISOString();
      if (['success', 'failed', 'skipped'].includes(status)) {
        stage.completedAt = new Date().toISOString();
        if (stage.startedAt) {
          stage.durationMs = Date.now() - new Date(stage.startedAt).getTime();
        }
      }
      if (log) stage.logs = [...(stage.logs ?? []), log];
    }

    // Update overall status
    const hasFailed = stages.some((s) => s.status === 'failed');
    const allDone = stages.every((s) => ['success', 'failed', 'skipped', 'blocked'].includes(s.status));
    if (hasFailed) run.status = 'failed';
    else if (allDone) run.status = 'success';

    run.stages = stages as unknown as object[];
    if (allDone) run.completedAt = new Date();
    await this.repo.save(run);
  }

  async updateStatus(id: string, status: StageStatus): Promise<void> {
    await this.repo.update(id, { status, ...(status === 'success' || status === 'failed' ? { completedAt: new Date() } : {}) });
  }

  async getStats(organizationId: string) {
    const runs = await this.repo.find({ where: { organizationId }, take: 100, order: { createdAt: 'DESC' } });
    const total = runs.length;
    const succeeded = runs.filter((r) => r.status === 'success').length;
    const failed = runs.filter((r) => r.status === 'failed').length;
    const running = runs.filter((r) => r.status === 'running').length;
    return { total, succeeded, failed, running, successRate: total ? Math.round((succeeded / total) * 100) : 0 };
  }
}
