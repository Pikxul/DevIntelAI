import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GovernanceService } from './governance.service';
import { User, Organization, ApprovalRequestEntity, AuditLogEntity, AuditArchiveLog } from '../../entities';

const mockUserRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
});

const mockOrgRepo = () => ({
  findOne: jest.fn(),
});

const mockApprovalRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
});

const mockAuditRepo = () => {
  const store: any[] = [];
  return {
    create: jest.fn().mockImplementation((dto) => {
      const obj = { ...dto, id: `audit-${store.length + 1}`, createdAt: new Date() };
      return obj;
    }),
    save: jest.fn().mockImplementation(async (entry) => {
      store.push(entry);
      return entry;
    }),
    find: jest.fn().mockImplementation(async (opts) => {
      return store;
    }),
    findOne: jest.fn().mockImplementation(async (opts) => {
      if (store.length === 0) return null;
      return store[store.length - 1];
    }),
    delete: jest.fn().mockImplementation(async (ids) => {
      return { affected: ids.length };
    }),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockImplementation(async () => {
        return store;
      }),
    }),
  };
};

const mockArchiveRepo = () => ({
  create: jest.fn().mockImplementation((dto) => dto),
  save: jest.fn().mockImplementation(async (dto) => dto),
});

const mockPipelineQueue = () => ({
  add: jest.fn(),
});

describe('GovernanceService - Cryptographic Ledger Audit Chain', () => {
  let service: GovernanceService;
  let auditRepo: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GovernanceService,
        { provide: getRepositoryToken(User), useFactory: mockUserRepo },
        { provide: getRepositoryToken(Organization), useFactory: mockOrgRepo },
        { provide: getRepositoryToken(ApprovalRequestEntity), useFactory: mockApprovalRepo },
        { provide: getRepositoryToken(AuditLogEntity), useFactory: mockAuditRepo },
        { provide: getRepositoryToken(AuditArchiveLog), useFactory: mockArchiveRepo },
        { provide: 'BullQueue_pipeline', useFactory: mockPipelineQueue },
      ],
    }).compile();

    service = module.get<GovernanceService>(GovernanceService);
    auditRepo = module.get(getRepositoryToken(AuditLogEntity));
  });

  it('generates cryptographically-chained logs with correct parent hashes', async () => {
    const log1 = await service.addAuditLog({
      organizationId: 'org-abc',
      userId: 'user-1',
      userEmail: 'user1@test.com',
      action: 'pipeline_trigger',
      resource: 'pipeline',
      resourceId: 'pip-1',
      details: 'triggered first',
    });

    expect(log1.parentHash).toBe('genesis-hash');
    expect(log1.hash).toBeDefined();

    const log2 = await service.addAuditLog({
      organizationId: 'org-abc',
      userId: 'user-1',
      userEmail: 'user1@test.com',
      action: 'pipeline_approve',
      resource: 'pipeline',
      resourceId: 'pip-1',
      details: 'approved',
    });

    expect(log2.parentHash).toBe(log1.hash);
    expect(log2.hash).toBeDefined();

    const verification = await service.verifyAuditChain('org-abc');
    expect(verification.valid).toBe(true);
    expect(verification.compromisedLogsCount).toBe(0);
  });

  it('detects cryptographic chain tampering when hashes or parentHashes mismatch', async () => {
    const log1 = await service.addAuditLog({
      organizationId: 'org-abc',
      userId: 'user-1',
      userEmail: 'user1@test.com',
      action: 'trigger',
      resource: 'pip',
      resourceId: '1',
      details: 'original',
    });

    const log2 = await service.addAuditLog({
      organizationId: 'org-abc',
      userId: 'user-1',
      userEmail: 'user1@test.com',
      action: 'approve',
      resource: 'pip',
      resourceId: '1',
      details: 'original',
    });

    log2.parentHash = 'corrupted-parent-hash';

    const verification = await service.verifyAuditChain('org-abc');
    expect(verification.valid).toBe(false);
    expect(verification.compromisedLogsCount).toBeGreaterThan(0);
  });

  it('performs WORM archiving and purges archived audit log entries from DB', async () => {
    await service.addAuditLog({
      organizationId: 'org-abc',
      userId: 'user-1',
      userEmail: 'user1@test.com',
      action: 'trigger',
      resource: 'pip',
      resourceId: '1',
      details: 'original',
    });

    const archive = await service.archiveOldAuditLogs('org-abc', true);
    expect(archive).toBeDefined();
    expect(archive?.rowCount).toBe(1);
    expect(archive?.retentionPeriodYears).toBe(7);
    expect(auditRepo.delete).toHaveBeenCalled();
  });
});
