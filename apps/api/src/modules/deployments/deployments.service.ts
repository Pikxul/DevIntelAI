import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deployment } from '../../entities';
import { PipelinesService } from '../pipelines/pipelines.service';
import type { DeploymentTarget } from '@aidevops/shared-types';
import { v4 as uuid } from 'uuid';

@Injectable()
export class DeploymentsService {
  private readonly logger = new Logger(DeploymentsService.name);

  constructor(
    @InjectRepository(Deployment) private repo: Repository<Deployment>,
    @Inject(forwardRef(() => PipelinesService))
    private readonly pipelinesService: PipelinesService,
  ) {}

  async deploy(params: {
    pipelineRunId: string;
    target: DeploymentTarget;
    imageTag: string;
    previousImageTag?: string;
  }): Promise<Deployment> {
    const { pipelineRunId, target, imageTag, previousImageTag } = params;

    await this.pipelinesService.updateStage(pipelineRunId, 'deploy', 'running',
      `Deploying ${imageTag} to ${target.environment} via ${target.strategy}`);

    const deployment = this.repo.create({
      pipelineRunId,
      target: target as unknown as object,
      imageTag,
      previousImageTag,
      strategy: target.strategy,
      status: 'running',
      canaryWeight: target.canaryConfig?.enabled ? target.canaryConfig.initialWeight : undefined,
    });
    const saved = await this.repo.save(deployment);

    // Simulate deployment (in production, call K8s/Docker API)
    this.logger.log(`Deploying to ${target.environment}: ${imageTag}`);

    setTimeout(async () => {
      await this.repo.update(saved.id, { status: 'success', completedAt: new Date() });
      await this.pipelinesService.updateStage(pipelineRunId, 'deploy', 'success',
        `✅ Deployed to ${target.environment}`);
    }, 2000);

    return saved;
  }

  async rollback(deploymentId: string, reason: string): Promise<Deployment | null> {
    const deployment = await this.repo.findOne({ where: { id: deploymentId } });
    if (!deployment || !deployment.previousImageTag) {
      this.logger.warn(`Cannot rollback deployment ${deploymentId}: no previous image`);
      return null;
    }

    this.logger.warn(`Rolling back deployment ${deploymentId}: ${reason}`);
    await this.repo.update(deploymentId, {
      status: 'failed',
      rolledBackAt: new Date(),
      rollbackReason: reason,
    });

    return this.repo.findOne({ where: { id: deploymentId } });
  }

  async findLatestForProject(projectId: string): Promise<Deployment | null> {
    this.logger.log(`Finding latest active deployment for project ${projectId}`);
    return this.repo.createQueryBuilder('d')
      .innerJoin('pipeline_runs', 'p', 'd.pipelineRunId = p.id')
      .where('p.projectId = :projectId', { projectId })
      .orderBy('d.startedAt', 'DESC')
      .getOne();
  }

  async findAll(limit = 20): Promise<Deployment[]> {
    return this.repo.find({ order: { startedAt: 'DESC' }, take: limit });
  }

  async findOne(id: string): Promise<Deployment | null> {
    return this.repo.findOne({ where: { id } });
  }

  async getStats() {
    const deployments = await this.repo.find({ take: 200, order: { startedAt: 'DESC' } });
    const total = deployments.length;
    const succeeded = deployments.filter(d => d.status === 'success').length;
    const failed = deployments.filter(d => d.status === 'failed').length;
    const rolledBack = deployments.filter(d => d.rolledBackAt !== null).length;
    const byStrategy = {
      rolling: deployments.filter(d => d.strategy === 'rolling').length,
      blue_green: deployments.filter(d => d.strategy === 'blue_green').length,
      canary: deployments.filter(d => d.strategy === 'canary').length,
    };
    return { total, succeeded, failed, rolledBack, byStrategy };
  }
}
