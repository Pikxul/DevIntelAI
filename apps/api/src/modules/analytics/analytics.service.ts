import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PipelineRun, Deployment, IncidentAlertEntity, RollbackEventEntity } from '../../entities';

export interface DoraMetrics {
  deploymentFrequency: { daily: number; weekly: number; label: string };
  leadTime: { avgHours: number; label: string };
  changeFailureRate: { percentage: number; label: string };
  mttr: { avgMinutes: number; label: string };
  trend: Array<{ date: string; deployments: number; failures: number; mttr: number }>;
}

function classifyDoraLevel(metric: string, value: number): string {
  if (metric === 'deploymentFrequency') {
    if (value >= 1) return 'Elite';
    if (value >= 0.14) return 'High';
    if (value >= 0.03) return 'Medium';
    return 'Low';
  }
  if (metric === 'leadTime') {
    if (value <= 1) return 'Elite';
    if (value <= 24) return 'High';
    if (value <= 168) return 'Medium';
    return 'Low';
  }
  if (metric === 'changeFailureRate') {
    if (value <= 5) return 'Elite';
    if (value <= 15) return 'High';
    if (value <= 30) return 'Medium';
    return 'Low';
  }
  if (metric === 'mttr') {
    if (value <= 60) return 'Elite';
    if (value <= 1440) return 'High';
    if (value <= 10080) return 'Medium';
    return 'Low';
  }
  return 'Low';
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(PipelineRun) private pipelineRepo: Repository<PipelineRun>,
    @InjectRepository(Deployment) private deploymentRepo: Repository<Deployment>,
    @InjectRepository(IncidentAlertEntity) private incidentRepo: Repository<IncidentAlertEntity>,
    @InjectRepository(RollbackEventEntity) private rollbackRepo: Repository<RollbackEventEntity>,
  ) {}

  async getDoraMetrics(organizationId: string, days = 30, projectId?: string): Promise<DoraMetrics> {
    this.logger.log(`Calculating DORA metrics for organization ${organizationId} (project: ${projectId || 'all'})`);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // ── 1. Deployment Frequency (T6.3 & T6.4) ────────────────────────────────
    const totalDeploymentsQuery = this.deploymentRepo
      .createQueryBuilder('d')
      .innerJoin(PipelineRun, 'pr', 'pr.id = d.pipelineRunId')
      .where('pr.organizationId = :orgId', { orgId: organizationId })
      .andWhere('d.startedAt >= :since', { since });

    if (projectId) {
      totalDeploymentsQuery.andWhere('pr.projectId = :projectId', { projectId });
    }
    const totalDeployments = await totalDeploymentsQuery.getCount();

    // Successful pipeline runs act as valid deployments proxy
    const successfulPipelineRunsQuery = this.pipelineRepo
      .createQueryBuilder('pr')
      .where('pr.organizationId = :orgId', { orgId: organizationId })
      .andWhere('pr.status = :status', { status: 'success' })
      .andWhere('pr.createdAt >= :since', { since });

    if (projectId) {
      successfulPipelineRunsQuery.andWhere('pr.projectId = :projectId', { projectId });
    }
    const successfulPipelineRuns = await successfulPipelineRunsQuery.getCount();

    const effectiveDeployments = Math.max(totalDeployments, successfulPipelineRuns);
    const dailyFreq = effectiveDeployments / days;
    const weeklyFreq = dailyFreq * 7;

    // ── 2. Change Failure Rate (T6.3 & T6.4) ──────────────────────────────────
    const failedDeploymentsQuery = this.deploymentRepo
      .createQueryBuilder('d')
      .innerJoin(PipelineRun, 'pr', 'pr.id = d.pipelineRunId')
      .where('pr.organizationId = :orgId', { orgId: organizationId })
      .andWhere('d.startedAt >= :since', { since })
      .andWhere('d.status IN (:...statuses)', { statuses: ['failed', 'rolled_back'] });

    if (projectId) {
      failedDeploymentsQuery.andWhere('pr.projectId = :projectId', { projectId });
    }
    const failedDeployments = await failedDeploymentsQuery.getCount();

    const totalFailedRunsQuery = this.pipelineRepo
      .createQueryBuilder('pr')
      .where('pr.organizationId = :orgId', { orgId: organizationId })
      .andWhere('pr.status IN (:...s)', { s: ['failed'] })
      .andWhere('pr.createdAt >= :since', { since });

    if (projectId) {
      totalFailedRunsQuery.andWhere('pr.projectId = :projectId', { projectId });
    }
    const totalFailedRuns = await totalFailedRunsQuery.getCount();

    const totalAttempts = effectiveDeployments + totalFailedRuns;
    const effectiveCfr = totalAttempts > 0
      ? Math.round((Math.max(failedDeployments, totalFailedRuns) / totalAttempts) * 100 * 10) / 10
      : 0;

    // ── 3. Lead Time (T6.3 & T6.4) ────────────────────────────────────────────
    let avgLeadTimeHours = 0;
    const completedDeploymentsQuery = this.deploymentRepo
      .createQueryBuilder('d')
      .innerJoin(PipelineRun, 'pr', 'pr.id = d.pipelineRunId')
      .where('pr.organizationId = :orgId', { orgId: organizationId })
      .andWhere('d.status = :status', { status: 'success' })
      .andWhere('d.completedAt IS NOT NULL');

    if (projectId) {
      completedDeploymentsQuery.andWhere('pr.projectId = :projectId', { projectId });
    }

    const completedDeployments = await completedDeploymentsQuery.getMany();

    if (completedDeployments.length > 0) {
      let totalLeadTimeMs = 0;
      let countedDeployments = 0;

      for (const d of completedDeployments) {
        const pipelineRun = await this.pipelineRepo.findOne({ where: { id: d.pipelineRunId } });
        if (pipelineRun) {
          const startTime = pipelineRun.createdAt.getTime();
          const endTime = d.completedAt.getTime();
          totalLeadTimeMs += Math.max(0, endTime - startTime);
          countedDeployments++;
        }
      }

      if (countedDeployments > 0) {
        avgLeadTimeHours = Math.round((totalLeadTimeMs / countedDeployments / 3600000) * 10) / 10;
      }
    }


    // ── 4. MTTR from rollback events (T6.3 & T6.4) ────────────────────────────
    const rollbacksQuery = this.rollbackRepo
      .createQueryBuilder('r')
      .where('r.triggeredAt >= :since', { since })
      .andWhere('r.completedAt IS NOT NULL');

    if (projectId) {
      // Filter rollbacks by project by joining through the incident_alerts table
      rollbacksQuery
        .innerJoin('incident_alerts', 'i', 'r.incidentId = i.id')
        .andWhere('i.projectId = :projectId', { projectId });
    }

    const rollbacks = await rollbacksQuery
      .select(['r.triggeredAt', 'r.completedAt'])
      .getMany();

    let avgMttrMinutes = 0;
    if (rollbacks.length > 0) {
      const totalMs = rollbacks.reduce((sum, r) => {
        const ms = r.completedAt ? new Date(r.completedAt).getTime() - r.triggeredAt.getTime() : 0;
        return sum + ms;
      }, 0);
      avgMttrMinutes = Math.round(totalMs / rollbacks.length / 60000);
    }

    // ── 5. Trend Data (Last 8 Days) (T6.3 & T6.4) ─────────────────────────────
    const trend: DoraMetrics['trend'] = [];
    for (let i = Math.min(days - 1, 7); i >= 0; i--) {
      const dayStart = new Date(Date.now() - i * 86400000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 86400000);

      const dayDeploysQuery = this.deploymentRepo
        .createQueryBuilder('d')
        .where('d.startedAt >= :start AND d.startedAt < :end', { start: dayStart, end: dayEnd });

      if (projectId) {
        dayDeploysQuery
          .innerJoin(PipelineRun, 'pr', 'd.pipelineRunId = pr.id')
          .andWhere('pr.projectId = :projectId', { projectId });
      }
      const dayDeploys = await dayDeploysQuery.getCount();

      const dayPipelineSuccessesQuery = this.pipelineRepo
        .createQueryBuilder('pr')
        .where('pr.createdAt >= :start AND pr.createdAt < :end', { start: dayStart, end: dayEnd })
        .andWhere('pr.status = :s', { s: 'success' });

      if (projectId) {
        dayPipelineSuccessesQuery.andWhere('pr.projectId = :projectId', { projectId });
      }
      const dayPipelineSuccesses = await dayPipelineSuccessesQuery.getCount();

      const dayFailsQuery = this.deploymentRepo
        .createQueryBuilder('d')
        .where('d.startedAt >= :start AND d.startedAt < :end', { start: dayStart, end: dayEnd })
        .andWhere('d.status IN (:...s)', { s: ['failed', 'rolled_back'] });

      if (projectId) {
        dayFailsQuery
          .innerJoin(PipelineRun, 'pr', 'd.pipelineRunId = pr.id')
          .andWhere('pr.projectId = :projectId', { projectId });
      }
      const dayFails = await dayFailsQuery.getCount();

      const dayFailedPipelinesQuery = this.pipelineRepo
        .createQueryBuilder('pr')
        .where('pr.createdAt >= :start AND pr.createdAt < :end', { start: dayStart, end: dayEnd })
        .andWhere('pr.status = :s', { s: 'failed' });

      if (projectId) {
        dayFailedPipelinesQuery.andWhere('pr.projectId = :projectId', { projectId });
      }
      const dayFailedPipelines = await dayFailedPipelinesQuery.getCount();

      trend.push({
        date: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        deployments: Math.max(dayDeploys, dayPipelineSuccesses),
        failures: Math.max(dayFails, dayFailedPipelines),
        mttr: avgMttrMinutes,
      });
    }

    return {
      deploymentFrequency: {
        daily: Math.round(dailyFreq * 10) / 10,
        weekly: Math.round(weeklyFreq),
        label: classifyDoraLevel('deploymentFrequency', dailyFreq),
      },
      leadTime: {
        avgHours: avgLeadTimeHours,
        label: classifyDoraLevel('leadTime', avgLeadTimeHours),
      },
      changeFailureRate: {
        percentage: effectiveCfr,
        label: classifyDoraLevel('changeFailureRate', effectiveCfr),
      },
      mttr: {
        avgMinutes: avgMttrMinutes,
        label: classifyDoraLevel('mttr', avgMttrMinutes),
      },
      trend,
    };
  }
}
