import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { User, Organization, ApprovalRequestEntity, AuditLogEntity } from '../../entities';

export interface AuditLogEntry {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId: string;
  details?: string;
  createdAt: Date;
}

export interface ApprovalRequest {
  id: string;
  pipelineRunId: string;
  projectId: string;
  organizationId: string;
  requestedBy: string;
  reviewedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  createdAt: Date;
  reviewedAt?: Date;
}

@Injectable()
export class GovernanceService {
  private readonly logger = new Logger(GovernanceService.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Organization) private orgRepo: Repository<Organization>,
    @InjectRepository(ApprovalRequestEntity) private approvalRepo: Repository<ApprovalRequestEntity>,
    @InjectRepository(AuditLogEntity) private auditRepo: Repository<AuditLogEntity>,
    @InjectQueue('pipeline') private pipelineQueue: Queue,
  ) {}

  // ─── Members ─────────────────────────────────────────────────────────────────

  async getMembers(organizationId: string): Promise<User[]> {
    return this.userRepo.find({ where: { organizationId }, order: { createdAt: 'DESC' } });
  }

  async updateMemberRole(
    memberId: string,
    role: string,
    actorEmail = 'system',
  ): Promise<User | null> {
    const user = await this.userRepo.findOne({ where: { id: memberId } });
    if (!user) return null;

    const oldRole = user.role;
    await this.userRepo.update(memberId, { role });
    const updated = await this.userRepo.findOne({ where: { id: memberId } });

    await this.addAuditLog({
      organizationId: user.organizationId,
      userId: memberId,
      userEmail: actorEmail,
      action: 'update_role',
      resource: 'user',
      resourceId: memberId,
      details: `Role changed from ${oldRole} to ${role}`,
    });

    return updated;
  }

  // ─── Approval Requests ────────────────────────────────────────────────────────

  async createApprovalRequest(params: {
    pipelineRunId: string;
    projectId: string;
    organizationId: string;
    requestedBy: string;
  }): Promise<ApprovalRequest> {
    const req = this.approvalRepo.create({
      ...params,
      status: 'pending',
    });
    const saved = await this.approvalRepo.save(req);
    this.logger.log(`Created approval request ${saved.id} in DB for pipeline ${params.pipelineRunId}`);
    return saved as unknown as ApprovalRequest;
  }

  async getApprovalRequests(organizationId: string): Promise<ApprovalRequest[]> {
    const requests = await this.approvalRepo.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
    return requests as unknown as ApprovalRequest[];
  }

  async approveRequest(id: string, reviewerEmail: string, reason?: string): Promise<ApprovalRequest> {
    const req = await this.approvalRepo.findOne({ where: { id } });
    if (!req) throw new Error(`Approval request ${id} not found`);

    req.status = 'approved';
    req.reviewedBy = reviewerEmail;
    req.reason = reason || '';
    req.reviewedAt = new Date();
    const saved = await this.approvalRepo.save(req);

    await this.addAuditLog({
      organizationId: req.organizationId,
      userId: reviewerEmail,
      userEmail: reviewerEmail,
      action: 'approve_pipeline',
      resource: 'pipeline_run',
      resourceId: req.pipelineRunId,
      details: reason ?? 'Approved via governance dashboard',
    });

    // ✅ KEY: Re-queue the blocked pipeline to resume execution
    await this.pipelineQueue.add('resume', {
      pipelineRunId: req.pipelineRunId,
      fromStage: 'unit_tests',
      organizationId: req.organizationId,
      projectId: req.projectId,
      author: reviewerEmail,
    }, { attempts: 2 });

    this.logger.log(`Pipeline ${req.pipelineRunId} approved by ${reviewerEmail} — re-queued for execution`);
    return saved as unknown as ApprovalRequest;
  }

  async rejectRequest(id: string, reviewerEmail: string, reason: string): Promise<ApprovalRequest> {
    const req = await this.approvalRepo.findOne({ where: { id } });
    if (!req) throw new Error(`Approval request ${id} not found`);

    req.status = 'rejected';
    req.reviewedBy = reviewerEmail;
    req.reason = reason;
    req.reviewedAt = new Date();
    const saved = await this.approvalRepo.save(req);

    await this.addAuditLog({
      organizationId: req.organizationId,
      userId: reviewerEmail,
      userEmail: reviewerEmail,
      action: 'reject_pipeline',
      resource: 'pipeline_run',
      resourceId: req.pipelineRunId,
      details: reason,
    });

    return saved as unknown as ApprovalRequest;
  }

  // ─── Audit Logs ───────────────────────────────────────────────────────────────

  async addAuditLog(params: {
    organizationId: string;
    userId: string;
    userEmail: string;
    action: string;
    resource: string;
    resourceId: string;
    details?: string;
  }): Promise<AuditLogEntry> {
    const entry = this.auditRepo.create(params);
    const saved = await this.auditRepo.save(entry);
    return saved as unknown as AuditLogEntry;
  }

  async getAuditLogs(organizationId: string, limit = 50): Promise<AuditLogEntry[]> {
    const logs = await this.auditRepo.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return logs as unknown as AuditLogEntry[];
  }
}
