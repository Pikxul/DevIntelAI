import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getAIClient } from '@aidevops/ai-client';
import { AnomalyAlert } from '../../entities';
import type { MetricSnapshot } from '@aidevops/shared-types';
import { EventsGateway } from '../gateway/gateway.module';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    @InjectRepository(AnomalyAlert) private repo: Repository<AnomalyAlert>,
    @Inject(forwardRef(() => EventsGateway)) private readonly eventsGateway: EventsGateway,
  ) {}

  async ingestMetrics(deploymentId: string, metrics: MetricSnapshot): Promise<AnomalyAlert | null> {
    const aiClient = getAIClient();
    const anomaly = await aiClient.detectAnomaly(metrics, deploymentId);

    if (!anomaly) {
      this.logger.debug(`No anomaly detected for deployment ${deploymentId}`);
      return null;
    }

    this.logger.warn(`🚨 Anomaly detected: ${anomaly.type} (severity: ${anomaly.severity})`);

    const entity = this.repo.create({
      deploymentId,
      type: anomaly.type,
      severity: anomaly.severity,
      title: anomaly.title,
      description: anomaly.description,
      metric: anomaly.metric,
      currentValue: anomaly.currentValue,
      expectedRange: anomaly.expectedRange as unknown as object,
      confidence: anomaly.confidence,
      recommendation: anomaly.recommendation,
      autoRollbackTriggered: false,
    });

    const saved = await this.repo.save(entity);

    // Emit live WebSocket event
    try {
      let orgId = 'default-org';
      const res = await this.repo.createQueryBuilder('a')
        .innerJoin('deployments', 'd', 'd.id = :deploymentId', { deploymentId })
        .innerJoin('pipeline_runs', 'p', 'd.pipelineRunId = p.id')
        .select('p.organizationId', 'orgId')
        .getRawOne();
      if (res && res.orgId) {
        orgId = res.orgId;
      }
      this.eventsGateway.emitAnomalyAlert(orgId, saved);
    } catch (err) {
      this.logger.warn(`Failed to emit anomaly WebSocket alert: ${err.message}`);
    }

    return saved;
  }

  async getAnomalies(organizationId: string, deploymentId?: string, limit = 20): Promise<AnomalyAlert[]> {
    const qb = this.repo.createQueryBuilder('a')
      .innerJoin('deployments', 'd', 'a.deploymentId = d.id')
      .innerJoin('pipeline_runs', 'p', 'd.pipelineRunId = p.id')
      .where('p.organizationId = :organizationId', { organizationId });

    if (deploymentId) {
      qb.andWhere('a.deploymentId = :deploymentId', { deploymentId });
    }

    return qb.orderBy('a.detectedAt', 'DESC').take(limit).getMany();
  }

  async getActiveAlerts(organizationId: string): Promise<AnomalyAlert[]> {
    return this.repo.createQueryBuilder('a')
      .innerJoin('deployments', 'd', 'a.deploymentId = d.id')
      .innerJoin('pipeline_runs', 'p', 'd.pipelineRunId = p.id')
      .where('p.organizationId = :organizationId', { organizationId })
      .andWhere('a.autoRollbackTriggered = :triggered', { triggered: false })
      .orderBy('a.detectedAt', 'DESC')
      .take(10)
      .getMany();
  }

  async markRollbackTriggered(alertId: string): Promise<void> {
    await this.repo.update(alertId, { autoRollbackTriggered: true });
  }
}
