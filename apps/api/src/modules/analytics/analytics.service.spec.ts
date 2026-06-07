import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { PipelineRun, Deployment, IncidentAlertEntity, RollbackEventEntity } from '../../entities';

const mockPipelineRepo = () => ({
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(2),
  })),
  findOne: jest.fn(),
});

const mockDeploymentRepo = () => ({
  createQueryBuilder: jest.fn(() => ({
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(5),
    getMany: jest.fn(),
  })),
});

const mockIncidentRepo = () => ({
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(0),
  })),
});

const mockRollbackRepo = () => ({
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  })),
});

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let pipelineRepo: any;
  let deploymentRepo: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: getRepositoryToken(PipelineRun), useFactory: mockPipelineRepo },
        { provide: getRepositoryToken(Deployment), useFactory: mockDeploymentRepo },
        { provide: getRepositoryToken(IncidentAlertEntity), useFactory: mockIncidentRepo },
        { provide: getRepositoryToken(RollbackEventEntity), useFactory: mockRollbackRepo },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    pipelineRepo = module.get(getRepositoryToken(PipelineRun));
    deploymentRepo = module.get(getRepositoryToken(Deployment));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDoraMetrics', () => {
    it('should calculate dynamic DORA lead time correctly', async () => {
      // Mock completed successful deployments
      const mockDeployments = [
        { id: 'd-1', pipelineRunId: 'pr-1', completedAt: new Date('2026-06-01T12:00:00Z') },
        { id: 'd-2', pipelineRunId: 'pr-2', completedAt: new Date('2026-06-01T14:30:00Z') },
      ];

      const getManyMock = jest.fn().mockResolvedValue(mockDeployments);
      
      jest.spyOn(deploymentRepo, 'createQueryBuilder').mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
        getMany: getManyMock,
        select: jest.fn().mockReturnThis(),
      } as any);

      // Mock corresponding PipelineRuns with their creation times
      pipelineRepo.findOne.mockImplementation(({ where }: { where: { id: string } }) => {
        if (where.id === 'pr-1') {
          return Promise.resolve({ id: 'pr-1', createdAt: new Date('2026-06-01T10:00:00Z') }); // 2 hours difference
        }
        if (where.id === 'pr-2') {
          return Promise.resolve({ id: 'pr-2', createdAt: new Date('2026-06-01T12:00:00Z') }); // 2.5 hours difference
        }
        return Promise.resolve(null);
      });

      const metrics = await service.getDoraMetrics('org-123', 30);

      // Average lead time: (2 hours + 2.5 hours) / 2 = 2.25 hours, rounded to 2.3 hours
      expect(metrics.leadTime.avgHours).toBe(2.3);
      expect(metrics.leadTime.label).toBe('High');
    });

    it('should return 0 when no successful deployments are present', async () => {
      jest.spyOn(deploymentRepo, 'createQueryBuilder').mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        getMany: jest.fn().mockResolvedValue([]),
      } as any);

      const metrics = await service.getDoraMetrics('org-123', 30);

      expect(metrics.leadTime.avgHours).toBe(0);
      expect(metrics.leadTime.label).toBe('Elite');
    });
  });
});
