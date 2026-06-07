import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeploymentsService } from './deployments.service';
import { PipelinesService } from '../pipelines/pipelines.service';
import { Deployment } from '../../entities';

const mockDeploymentRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
});

const mockPipelinesService = () => ({
  updateStage: jest.fn().mockResolvedValue(undefined),
});

describe('DeploymentsService', () => {
  let service: DeploymentsService;
  let repo: ReturnType<typeof mockDeploymentRepo>;
  let pipelines: ReturnType<typeof mockPipelinesService>;

  beforeEach(async () => {
    jest.useFakeTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeploymentsService,
        { provide: getRepositoryToken(Deployment), useFactory: mockDeploymentRepo },
        { provide: PipelinesService, useFactory: mockPipelinesService },
      ],
    }).compile();

    service = module.get<DeploymentsService>(DeploymentsService);
    repo = module.get(getRepositoryToken(Deployment));
    pipelines = module.get(PipelinesService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('deploy', () => {
    const baseParams = {
      pipelineRunId: 'run-1',
      target: {
        id: 'target-1', name: 'prod', type: 'kubernetes' as const,
        environment: 'production' as const, strategy: 'rolling' as const,
      },
      imageTag: 'v1.2.3',
      previousImageTag: 'v1.2.2',
    };

    it('creates a deployment record with correct strategy and status', async () => {
      const mockDeployment = { id: 'dep-1', ...baseParams, status: 'running' };
      repo.create.mockReturnValue(mockDeployment);
      repo.save.mockResolvedValue(mockDeployment);

      const result = await service.deploy(baseParams);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          pipelineRunId: 'run-1',
          imageTag: 'v1.2.3',
          strategy: 'rolling',
          status: 'running',
        }),
      );
      expect(result.status).toBe('running');
    });

    it('calls pipelinesService.updateStage with deploy running', async () => {
      repo.create.mockReturnValue({ id: 'dep-2' });
      repo.save.mockResolvedValue({ id: 'dep-2' });

      await service.deploy(baseParams);

      expect(pipelines.updateStage).toHaveBeenCalledWith(
        'run-1',
        'deploy',
        'running',
        expect.stringContaining('v1.2.3'),
      );
    });

    it('sets canaryWeight from canaryConfig when strategy is canary', async () => {
      const canaryParams = {
        ...baseParams,
        target: {
          id: 'target-1', name: 'prod', type: 'kubernetes' as const,
          environment: 'production' as const,
          strategy: 'canary' as const,
          canaryConfig: {
            enabled: true,
            initialWeight: 5,
            targetWeight: 100,
            stepSize: 10,
            stepIntervalMinutes: 10,
            metricsThreshold: { errorRateMax: 1, latencyP99MaxMs: 500 },
          },
        },
      };
      repo.create.mockReturnValue({ id: 'dep-3', canaryWeight: 5, status: 'running' });
      repo.save.mockResolvedValue({ id: 'dep-3', canaryWeight: 5, status: 'running' });

      const result = await service.deploy(canaryParams);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ canaryWeight: 5 }),
      );
    });
  });

  describe('rollback', () => {
    it('returns null when deployment has no previous image tag', async () => {
      repo.findOne.mockResolvedValue({ id: 'dep-4', previousImageTag: null });
      const result = await service.rollback('dep-4', 'critical anomaly');
      expect(result).toBeNull();
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('updates deployment status to failed and sets rollbackReason', async () => {
      const dep = { id: 'dep-5', previousImageTag: 'v1.1.0' };
      repo.findOne
        .mockResolvedValueOnce(dep) // first call in rollback
        .mockResolvedValueOnce({ ...dep, status: 'failed', rollbackReason: 'critical anomaly' }); // return from final findOne

      repo.update.mockResolvedValue({});

      const result = await service.rollback('dep-5', 'critical anomaly');

      expect(repo.update).toHaveBeenCalledWith(
        'dep-5',
        expect.objectContaining({
          status: 'failed',
          rollbackReason: 'critical anomaly',
        }),
      );
    });

    it('returns null when deployment is not found', async () => {
      repo.findOne.mockResolvedValue(null);
      const result = await service.rollback('nonexistent', 'reason');
      expect(result).toBeNull();
    });
  });

  describe('getStats', () => {
    it('calculates correct counts from deployment list', async () => {
      repo.find.mockResolvedValue([
        { status: 'success', strategy: 'rolling', rolledBackAt: null },
        { status: 'success', strategy: 'canary', rolledBackAt: null },
        { status: 'failed', strategy: 'rolling', rolledBackAt: new Date() },
        { status: 'failed', strategy: 'blue_green', rolledBackAt: null },
      ]);

      const stats = await service.getStats();

      expect(stats.total).toBe(4);
      expect(stats.succeeded).toBe(2);
      expect(stats.failed).toBe(2);
      expect(stats.rolledBack).toBe(1);
      expect(stats.byStrategy.rolling).toBe(2);
      expect(stats.byStrategy.canary).toBe(1);
    });
  });
});
