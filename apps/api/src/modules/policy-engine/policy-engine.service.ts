import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PipelinePolicy } from '../../entities/PipelinePolicy';
import { Project } from '../../entities';
import type { AIReviewResult, PolicyDecision } from '@aidevops/shared-types';

@Injectable()
export class PolicyEngineService {
  private readonly logger = new Logger(PolicyEngineService.name);

  constructor(
    @InjectRepository(PipelinePolicy) private repo: Repository<PipelinePolicy>,
    @InjectRepository(Project) private projectRepo: Repository<Project>,
  ) {}

  async evaluate(review: AIReviewResult, organizationId: string, projectId?: string): Promise<{ decision: PolicyDecision; reason?: string }> {
    this.logger.log(`Evaluating policies for organization ${organizationId}`);

    // 1. Enforce Project-Specific Risk Thresholds (T4.3)
    if (projectId) {
      const project = await this.projectRepo.findOne({ where: { id: projectId } });
      if (project && review.riskScore && typeof review.riskScore.overall === 'number') {
        const overallRisk = review.riskScore.overall;
        if (overallRisk >= project.riskThreshold) {
          this.logger.log(`🚫 Project risk threshold gate triggered: ${overallRisk} >= ${project.riskThreshold}`);
          return {
            decision: 'needs_review',
            reason: `AI Overall Risk Score (${overallRisk}/100) meets or exceeds project risk threshold of ${project.riskThreshold}/100`,
          };
        }
      }
    }
    
    // 2. Fetch active policies for this org/project
    const policies = await this.repo.find({
      where: [
        { organizationId, projectId, enabled: true },
        { organizationId, enabled: true }
      ]
    });

    if (policies.length === 0) {
      // Default fallback if no policies exist
      return { decision: 'approved', reason: 'No active policies found' };
    }

    for (const policy of policies) {
      const match = this.evaluatePolicy(review, policy);
      if (match) {
        this.logger.log(`Policy "${policy.name}" triggered: ${policy.action}`);
        return { decision: policy.action, reason: `Policy matched: ${policy.name}` };
      }
    }

    return { decision: 'approved', reason: 'All policies passed' };
  }

  private evaluatePolicy(review: AIReviewResult, policy: PipelinePolicy): boolean {
    for (const rule of policy.rules) {
      let metricValue = 0;

      switch (rule.field) {
        case 'overall_risk':
          metricValue = review.riskScore.overall;
          break;
        case 'security_risk':
          metricValue = review.riskScore.security;
          break;
        case 'quality_risk':
          metricValue = review.riskScore.quality;
          break;
        case 'critical_issues':
          metricValue = review.issues.filter(i => i.riskLevel === 'critical').length;
          break;
        case 'high_issues':
          metricValue = review.issues.filter(i => i.riskLevel === 'high').length;
          break;
      }

      const passed = this.evaluateRule(metricValue, rule.operator, rule.value);
      // If any rule matches the threshold condition, the policy applies.
      // Wait, we assume rules in a policy are ANDed or ORed?
      // Let's assume ALL rules must match for the policy to trigger its action (AND logic).
      if (!passed) {
        return false;
      }
    }
    
    // If we have no rules, policy does not trigger.
    return policy.rules.length > 0;
  }

  private evaluateRule(actual: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case 'gt': return actual > threshold;
      case 'lt': return actual < threshold;
      case 'gte': return actual >= threshold;
      case 'lte': return actual <= threshold;
      case 'eq': return actual === threshold;
      default: return false;
    }
  }

  async createPolicy(policyData: Partial<PipelinePolicy>): Promise<PipelinePolicy> {
    const policy = this.repo.create(policyData);
    return this.repo.save(policy);
  }

  async updatePolicy(id: string, data: Partial<PipelinePolicy>): Promise<PipelinePolicy | null> {
    await this.repo.update(id, data);
    return this.repo.findOne({ where: { id } });
  }

  async getPolicies(organizationId: string): Promise<PipelinePolicy[]> {
    const where = organizationId ? { organizationId } : {};
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  async deletePolicy(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
