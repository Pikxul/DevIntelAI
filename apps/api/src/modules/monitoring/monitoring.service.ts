import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getAIClient } from '@aidevops/ai-client';
import { AnomalyAlert } from '../../entities';
import type { MetricSnapshot } from '@aidevops/shared-types';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    @InjectRepository(AnomalyAlert) private repo: Repository<AnomalyAlert>,
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

    return this.repo.save(entity);
  }

  async getAnomalies(deploymentId?: string, limit = 20): Promise<AnomalyAlert[]> {
    const where = deploymentId ? { deploymentId } : {};
    return this.repo.find({ where, order: { detectedAt: 'DESC' }, take: limit });
  }

  async markRollbackTriggered(alertId: string): Promise<void> {
    await this.repo.update(alertId, { autoRollbackTriggered: true });
  }
}
