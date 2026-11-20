import { Test } from '@nestjs/testing';
import { ApplicationNotificationService } from './application-notification.service';
import { RedisService } from '@/shared/redis/redis.service';
import { PublicationService } from '@/modules/publication/services/publication.service';
import { CompaniesService } from '@/modules/companies/services/companies.service';
import { PushJobPublisherService } from '@/modules/notification/push-job-publisher.service';

describe('ApplicationNotificationService', () => {
  let service: ApplicationNotificationService;
  let mockRedisService: { incr: jest.Mock; del: jest.Mock };
  let mockPublicationService: { getById: jest.Mock };
  let mockCompaniesService: { getCompanyMemberUserIds: jest.Mock };
  let mockPushJobPublisherService: { publish: jest.Mock };

  beforeEach(async () => {
    mockRedisService = { incr: jest.fn(), del: jest.fn() };
    mockPublicationService = { getById: jest.fn().mockResolvedValue({ id: 10, companyId: 5 }) };
    mockCompaniesService = { getCompanyMemberUserIds: jest.fn().mockResolvedValue([1, 2]) };
    mockPushJobPublisherService = { publish: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ApplicationNotificationService,
        { provide: RedisService, useValue: mockRedisService },
        { provide: PublicationService, useValue: mockPublicationService },
        { provide: CompaniesService, useValue: mockCompaniesService },
        { provide: PushJobPublisherService, useValue: mockPushJobPublisherService },
      ],
    }).compile();

    service = moduleRef.get<ApplicationNotificationService>(ApplicationNotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should increment the unseen counter for the publication', async () => {
    mockRedisService.incr.mockResolvedValue(1);

    await service.handleApplicationCreated(10, 42, 100);

    expect(mockRedisService.incr).toHaveBeenCalledWith('publication:10:unseen_applications');
  });

  it('should not throw whether it is the first or a subsequent unseen application', async () => {
    mockRedisService.incr.mockResolvedValueOnce(1);
    await expect(service.handleApplicationCreated(10, 42, 100)).resolves.not.toThrow();

    mockRedisService.incr.mockResolvedValueOnce(2);
    await expect(service.handleApplicationCreated(10, 43, 101)).resolves.not.toThrow();
  });

  it('should do nothing when the publication has no company', async () => {
    mockRedisService.incr.mockResolvedValue(1);
    mockPublicationService.getById.mockResolvedValue({ id: 10, companyId: null });

    await service.handleApplicationCreated(10, 42, 100);

    expect(mockCompaniesService.getCompanyMemberUserIds).not.toHaveBeenCalled();
    expect(mockPushJobPublisherService.publish).not.toHaveBeenCalled();
  });

  it('should publish the push job for the company members with the computed unseen count', async () => {
    mockRedisService.incr.mockResolvedValue(3);

    await service.handleApplicationCreated(10, 42, 100);

    expect(mockCompaniesService.getCompanyMemberUserIds).toHaveBeenCalledWith(5);
    expect(mockPushJobPublisherService.publish).toHaveBeenCalledWith({
      recipientUserIds: [1, 2],
      outboxEventId: 100,
      applicationId: 42,
      payload: {
        title: 'Nouvelles candidatures',
        body: 'Vous avez 3 candidatures non vues sur cette offre',
        collapseId: 'publication:10',
        data: { publicationId: '10' },
      },
    });
  });

  it('should publish with the first-unseen wording when unseenCount is 1', async () => {
    mockRedisService.incr.mockResolvedValue(1);

    await service.handleApplicationCreated(10, 42, 100);

    expect(mockPushJobPublisherService.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          title: 'Nouvelle candidature',
          body: 'Vous avez reçu une nouvelle candidature',
        }),
      }),
    );
  });

  it('should reset the unseen counter by deleting the key', async () => {
    await service.resetUnseenCount(10);
    expect(mockRedisService.del).toHaveBeenCalledWith('publication:10:unseen_applications');
  });
});
