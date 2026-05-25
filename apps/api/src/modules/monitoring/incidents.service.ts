import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getAIClient } from '@aidevops/ai-client';
import { IncidentAlertEntity, RootCauseAnalysisEntity, RollbackEventEntity } from '../../entities';
import { DeploymentsService } from '../deployments/deployments.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(
    @InjectRepository(IncidentAlertEntity) private incidentRepo: Repository<IncidentAlertEntity>,
    @InjectRepository(RootCauseAnalysisEntity) private rcaRepo: Repository<RootCauseAnalysisEntity>,
    @InjectRepository(RollbackEventEntity) private rollbackRepo: Repository<RollbackEventEntity>,
    private readonly deploymentsService: DeploymentsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async handleIncidentWebhook(payload: any): Promise<any> {
    this.logger.log(`Received incident webhook from ${payload.source || 'unknown'}`);
    
    // 1. Save Incident
    const incident = this.incidentRepo.create({
      projectId: payload.projectId || 'unknown',
      deploymentId: payload.deploymentId,
      environment: payload.environment || 'production',
      source: payload.source || 'custom',
      severity: payload.severity || 'high',
      title: payload.title || 'Unknown Incident',
      description: payload.description || '',
      metric: payload.metric,
      value: payload.value,
      threshold: payload.threshold,
    });
    const savedIncident = await this.incidentRepo.save(incident);

    // 2. AI RCA Generation
    const aiClient = getAIClient();
    this.logger.log(`Generating RCA for incident ${savedIncident.id}...`);
    const rcaResult = await aiClient.generateRCA(savedIncident);
    
    // 3. Save RCA
    const rca = this.rcaRepo.create({
      incidentId: savedIncident.id,
      summary: rcaResult.summary,
      hypothesis: rcaResult.hypothesis,
      rootCause: rcaResult.rootCause,
      affectedComponents: rcaResult.affectedComponents,
      recommendedActions: rcaResult.recommendedActions,
      confidenceScore: rcaResult.confidenceScore,
    });
    const savedRca = await this.rcaRepo.save(rca);

    // 4. Trigger Auto-Rollback if critical
    let rollbackEvent = null;
    if (savedIncident.severity === 'critical' && savedIncident.deploymentId) {
      this.logger.warn(`Critical incident detected. Initiating auto-rollback for deployment ${savedIncident.deploymentId}`);
      try {
        const rollbackResult = await this.deploymentsService.rollback(savedIncident.deploymentId, 'Auto-rollback triggered by critical incident');
        
        if (rollbackResult) {
          rollbackEvent = this.rollbackRepo.create({
            incidentId: savedIncident.id,
            deploymentId: savedIncident.deploymentId,
            previousDeploymentId: rollbackResult.id, // The rolled-back deployment ID
            status: 'success',
            reason: 'Auto-rollback triggered by critical incident',
            triggeredBy: 'auto',
            completedAt: new Date(),
          });
          await this.rollbackRepo.save(rollbackEvent);
        }
      } catch (err) {
        this.logger.error(`Failed to execute auto-rollback: ${err.message}`);
      }
    }

    // 5. Notify Team
    await this.notificationsService.sendIncidentNotification(savedIncident, savedRca, rollbackEvent);

    return {
      incident: savedIncident,
      rca: savedRca,
      rollback: rollbackEvent,
    };
  }

  async getIncidents(projectId?: string): Promise<IncidentAlertEntity[]> {
    const where = projectId ? { projectId } : {};
    return this.incidentRepo.find({ where, order: { timestamp: 'DESC' } });
  }

  async getRCA(incidentId: string): Promise<RootCauseAnalysisEntity | null> {
    return this.rcaRepo.findOne({ where: { incidentId } });
  }
}
