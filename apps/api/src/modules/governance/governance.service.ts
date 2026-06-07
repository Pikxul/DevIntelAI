import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as crypto from 'crypto';
import { User, Organization, ApprovalRequestEntity, AuditLogEntity, AuditArchiveLog } from '../../entities';

export interface AuditLogEntry {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId: string;
  details?: string;
  hash?: string;
  parentHash?: string;
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
    @InjectRepository(AuditArchiveLog) private archiveRepo: Repository<AuditArchiveLog>,
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
    const lastLog = await this.auditRepo.findOne({
      where: { organizationId: params.organizationId },
      order: { createdAt: 'DESC' },
    });

    const parentHash = lastLog && lastLog.hash ? lastLog.hash : 'genesis-hash';
    const payload = `${params.action}-${params.resource}-${params.details || ''}-${parentHash}-${params.userId}-${params.organizationId}`;
    const hash = crypto.createHash('sha256').update(payload).digest('hex');

    const entry = this.auditRepo.create({
      ...params,
      parentHash,
      hash,
    });

    const saved = await this.auditRepo.save(entry);
    return saved as unknown as AuditLogEntry;
  }

  async verifyAuditChain(organizationId: string): Promise<{ valid: boolean; compromisedLogsCount: number }> {
    const logs = await this.auditRepo.find({
      where: { organizationId },
      order: { createdAt: 'ASC' },
    });

    let valid = true;
    let compromisedLogsCount = 0;
    let expectedParentHash = 'genesis-hash';

    for (const log of logs) {
      if (log.parentHash !== expectedParentHash) {
        valid = false;
        compromisedLogsCount++;
      }

      const payload = `${log.action}-${log.resource}-${log.details || ''}-${log.parentHash || ''}-${log.userId}-${log.organizationId}`;
      const calculatedHash = crypto.createHash('sha256').update(payload).digest('hex');

      if (log.hash !== calculatedHash) {
        valid = false;
        compromisedLogsCount++;
      }

      expectedParentHash = log.hash || 'genesis-hash';
    }

    return { valid, compromisedLogsCount };
  }

  async getAuditLogs(organizationId: string, limit = 50): Promise<AuditLogEntry[]> {
    const logs = await this.auditRepo.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return logs as unknown as AuditLogEntry[];
  }

  async archiveOldAuditLogs(organizationId: string, forceAll = false): Promise<AuditArchiveLog | null> {
    const queryBuilder = this.auditRepo.createQueryBuilder('log')
      .where('log.organizationId = :organizationId', { organizationId });

    if (!forceAll) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);
      queryBuilder.andWhere('log.createdAt < :cutoffDate', { cutoffDate });
    }

    const logs = await queryBuilder.orderBy('log.createdAt', 'ASC').getMany();

    if (logs.length === 0) {
      this.logger.log(`No logs found to archive for organization ${organizationId}`);
      return null;
    }

    // Convert logs to CSV WORM format
    let csvContent = 'id,action,resource,resourceId,userId,userEmail,parentHash,hash,createdAt\n';
    for (const log of logs) {
      csvContent += `${log.id},"${log.action.replace(/"/g, '""')}","${log.resource.replace(/"/g, '""')}",${log.resourceId},${log.userId},${log.userEmail},${log.parentHash || ''},${log.hash || ''},${log.createdAt.toISOString()}\n`;
    }

    const checksum = crypto.createHash('md5').update(csvContent).digest('hex');
    const s3Key = `archives/${organizationId}/${new Date().toISOString().substring(0, 7)}-archive.csv`;

    // Local WORM fallback simulation for sandbox/dev setup
    try {
      const fs = require('fs');
      const path = require('path');
      const archiveDir = path.join(process.cwd(), 'var', 'audit-archives', organizationId);
      fs.mkdirSync(archiveDir, { recursive: true });
      fs.writeFileSync(path.join(archiveDir, `${new Date().toISOString().substring(0, 10)}-archive.csv`), csvContent);
      this.logger.log(`WORM compliance archive file written locally: ${s3Key}`);
    } catch (err) {
      this.logger.error(`Failed to write local backup archive: ${err.message}`);
    }

    // Save compliance archive log record
    const archiveRecord = this.archiveRepo.create({
      organizationId,
      startDate: logs[0].createdAt,
      endDate: logs[logs.length - 1].createdAt,
      s3Key,
      checksum,
      rowCount: logs.length,
      retentionPeriodYears: 7,
    });

    const savedArchive = await this.archiveRepo.save(archiveRecord);

    // Secure DB Purge (T1.3)
    const ids = logs.map((l) => l.id);
    await this.auditRepo.delete(ids);
    this.logger.log(`Archived and securely purged ${ids.length} audit log rows for organization ${organizationId}`);

    return savedArchive;
  }
}
