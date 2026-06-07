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
      this.eventsGateway.emitAnomalyAlert(saved);
    } catch (err) {
      this.logger.warn(`Failed to emit anomaly WebSocket alert: ${err.message}`);
    }

    return saved;
  }

  async getAnomalies(deploymentId?: string, limit = 20): Promise<AnomalyAlert[]> {
    const where = deploymentId ? { deploymentId } : {};
    return this.repo.find({ where, order: { detectedAt: 'DESC' }, take: limit });
  }

  async getActiveAlerts(): Promise<AnomalyAlert[]> {
    return this.repo.find({
      where: { autoRollbackTriggered: false },
      order: { detectedAt: 'DESC' },
      take: 10,
    });
  }

  async markRollbackTriggered(alertId: string): Promise<void> {
    await this.repo.update(alertId, { autoRollbackTriggered: true });
  }
}
