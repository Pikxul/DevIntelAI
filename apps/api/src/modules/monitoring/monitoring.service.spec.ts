import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MonitoringService } from './monitoring.service';
import { AnomalyAlert } from '../../entities';
import { EventsGateway } from '../gateway/gateway.module';

const mockAnomalyAlertRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const mockEventsGateway = () => ({
  emitAnomalyAlert: jest.fn(),
  emitGlobalEvent: jest.fn(),
});

describe('MonitoringService', () => {
  let service: MonitoringService;
  let repo: any;
  let gateway: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringService,
        { provide: getRepositoryToken(AnomalyAlert), useFactory: mockAnomalyAlertRepo },
        { provide: EventsGateway, useFactory: mockEventsGateway },
      ],
    }).compile();

    service = module.get<MonitoringService>(MonitoringService);
    repo = module.get(getRepositoryToken(AnomalyAlert));
    gateway = module.get(EventsGateway);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getActiveAlerts', () => {
    it('should query repository for alerts where autoRollbackTriggered is false', async () => {
      const mockAlerts = [
        { id: 'a-1', title: 'High CPU', autoRollbackTriggered: false },
        { id: 'a-2', title: 'OOM Warning', autoRollbackTriggered: false },
      ];

      const qbMock = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockAlerts),
      };
      repo.createQueryBuilder.mockReturnValue(qbMock);

      const result = await service.getActiveAlerts('org1');

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('a');
      expect(qbMock.innerJoin).toHaveBeenCalledWith('deployments', 'd', 'a.deploymentId = d.id');
      expect(qbMock.innerJoin).toHaveBeenCalledWith('pipeline_runs', 'p', 'd.pipelineRunId = p.id');
      expect(qbMock.where).toHaveBeenCalledWith('p.organizationId = :organizationId', { organizationId: 'org1' });
      expect(qbMock.andWhere).toHaveBeenCalledWith('a.autoRollbackTriggered = :triggered', { triggered: false });
      expect(qbMock.getMany).toHaveBeenCalled();
      expect(result).toEqual(mockAlerts);
    });
  });
});
