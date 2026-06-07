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

      repo.find.mockResolvedValue(mockAlerts);

      const result = await service.getActiveAlerts();

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { autoRollbackTriggered: false },
          order: { detectedAt: 'DESC' },
        }),
      );
      expect(result).toEqual(mockAlerts);
    });
  });
});
