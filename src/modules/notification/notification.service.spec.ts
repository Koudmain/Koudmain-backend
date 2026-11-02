import { Test } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { RedisService } from '@/shared/redis/redis.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockRedisService: { incr: jest.Mock; del: jest.Mock };

  beforeEach(async () => {
    mockRedisService = { incr: jest.fn(), del: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [NotificationService, { provide: RedisService, useValue: mockRedisService }],
    }).compile();

    service = moduleRef.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should increment the unseen counter for the publication', async () => {
    mockRedisService.incr.mockResolvedValue(1);

    await service.handleApplicationCreated(10, 42);

    expect(mockRedisService.incr).toHaveBeenCalledWith('publication:10:unseen_applications');
  });

  it('should not throw whether it is the first or a subsequent unseen application', async () => {
    mockRedisService.incr.mockResolvedValueOnce(1);
    await expect(service.handleApplicationCreated(10, 42)).resolves.not.toThrow();

    mockRedisService.incr.mockResolvedValueOnce(2);
    await expect(service.handleApplicationCreated(10, 43)).resolves.not.toThrow();
  });

  it('should reset the unseen counter by deleting the key', async () => {
    await service.resetUnseenCount(10);
    expect(mockRedisService.del).toHaveBeenCalledWith('publication:10:unseen_applications');
  });
});
