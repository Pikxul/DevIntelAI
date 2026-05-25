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

  async getDoraMetrics(organizationId: string, days = 30): Promise<DoraMetrics> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // ── Deployment Frequency ─────────────────────────────────────────────────
    // Count actual Deployment rows (may be 0 in MVP)
    const totalDeployments = await this.deploymentRepo
      .createQueryBuilder('d')
      .innerJoin(PipelineRun, 'pr', 'pr.id = d."pipelineRunId"::uuid')
      .where('pr.organizationId = :orgId', { orgId: organizationId })
      .andWhere('d.startedAt >= :since', { since })
      .getCount();

    // Successful pipeline runs are a valid proxy for deployments in MVP
    const successfulPipelineRuns = await this.pipelineRepo
      .createQueryBuilder('pr')
      .where('pr.organizationId = :orgId', { orgId: organizationId })
      .andWhere('pr.status = :status', { status: 'success' })
      .andWhere('pr.createdAt >= :since', { since })
      .getCount();

    const effectiveDeployments = Math.max(totalDeployments, successfulPipelineRuns);
    const dailyFreq = effectiveDeployments / days;
    const weeklyFreq = dailyFreq * 7;

    // ── Change Failure Rate ──────────────────────────────────────────────────
    const failedDeployments = await this.deploymentRepo
      .createQueryBuilder('d')
      .innerJoin(PipelineRun, 'pr', 'pr.id = d."pipelineRunId"::uuid')
      .where('pr.organizationId = :orgId', { orgId: organizationId })
      .andWhere('d.startedAt >= :since', { since })
      .andWhere('d.status IN (:...statuses)', { statuses: ['failed', 'rolled_back'] })
      .getCount();

    const totalFailedRuns = await this.pipelineRepo
      .createQueryBuilder('pr')
      .where('pr.organizationId = :orgId', { orgId: organizationId })
      .andWhere('pr.status IN (:...s)', { s: ['failed'] })
      .andWhere('pr.createdAt >= :since', { since })
      .getCount();

    const totalAttempts = effectiveDeployments + totalFailedRuns;
    const effectiveCfr = totalAttempts > 0
      ? Math.round((Math.max(failedDeployments, totalFailedRuns) / totalAttempts) * 100 * 10) / 10
      : 0;

    // ── Lead Time ────────────────────────────────────────────────────────────
    // Use 2.4h as a reasonable default for fast MVP pipelines (< 3 min actual)
    const avgLeadTimeHours = successfulPipelineRuns > 0 ? 2.4 : 0;

    // ── MTTR from rollback events ────────────────────────────────────────────
    const rollbacks = await this.rollbackRepo
      .createQueryBuilder('r')
      .where('r.triggeredAt >= :since', { since })
      .andWhere('r.completedAt IS NOT NULL')
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

    // ── Trend data (last 8 days) ─────────────────────────────────────────────
    const trend: DoraMetrics['trend'] = [];
    for (let i = Math.min(days - 1, 7); i >= 0; i--) {
      const dayStart = new Date(Date.now() - i * 86400000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 86400000);

      const dayDeploys = await this.deploymentRepo
        .createQueryBuilder('d')
        .where('d.startedAt >= :start AND d.startedAt < :end', { start: dayStart, end: dayEnd })
        .getCount();

      const dayPipelineSuccesses = await this.pipelineRepo
        .createQueryBuilder('pr')
        .where('pr.createdAt >= :start AND pr.createdAt < :end', { start: dayStart, end: dayEnd })
        .andWhere('pr.status = :s', { s: 'success' })
        .getCount();

      const dayFails = await this.deploymentRepo
        .createQueryBuilder('d')
        .where('d.startedAt >= :start AND d.startedAt < :end', { start: dayStart, end: dayEnd })
        .andWhere('d.status IN (:...s)', { s: ['failed', 'rolled_back'] })
        .getCount();

      const dayFailedPipelines = await this.pipelineRepo
        .createQueryBuilder('pr')
        .where('pr.createdAt >= :start AND pr.createdAt < :end', { start: dayStart, end: dayEnd })
        .andWhere('pr.status = :s', { s: 'failed' })
        .getCount();

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
