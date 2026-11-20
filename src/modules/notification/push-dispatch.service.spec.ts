import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { PushDispatchService } from './push-dispatch.service';
import { PublicationService } from '@/modules/publication/services/publication.service';
import { CompaniesService } from '@/modules/companies/services/companies.service';
import { DeviceTokenService } from '@/modules/push/services/device-token.service';
import { PushService } from '@/modules/push/services/push.service';
import {
  NotificationDelivery,
  NotificationChannel,
  NotificationDeliveryStatus,
} from '@/modules/application/models/notification-delivery.model';
import { DeviceTokenPlatform } from '@/modules/push/models/device-token.model';

describe('PushDispatchService', () => {
  let service: PushDispatchService;
  let mockPublicationService: { getById: jest.Mock };
  let mockCompaniesService: { getCompanyMemberUserIds: jest.Mock };
  let mockDeviceTokenService: { getTokensByUserIds: jest.Mock; removeToken: jest.Mock };
  let mockPushService: { sendPush: jest.Mock };
  let mockNotificationDeliveryModel: { create: jest.Mock };

  const baseEvent = {
    publicationId: 10,
    applicationId: 42,
    outboxEventId: 100,
    unseenCount: 1,
    isFirstUnseen: true,
  };

  beforeEach(async () => {
    mockPublicationService = { getById: jest.fn().mockResolvedValue({ id: 10, companyId: 5 }) };
    mockCompaniesService = { getCompanyMemberUserIds: jest.fn().mockResolvedValue([1, 2]) };
    mockDeviceTokenService = {
      getTokensByUserIds: jest
        .fn()
        .mockResolvedValue([
          { id: 1, userId: 1, token: 'tok-1', platform: DeviceTokenPlatform.ANDROID },
        ]),
      removeToken: jest.fn().mockResolvedValue(undefined),
    };
    mockPushService = {
      sendPush: jest.fn().mockResolvedValue({ success: true, invalidToken: false }),
    };
    mockNotificationDeliveryModel = { create: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PushDispatchService,
        { provide: PublicationService, useValue: mockPublicationService },
        { provide: CompaniesService, useValue: mockCompaniesService },
        { provide: DeviceTokenService, useValue: mockDeviceTokenService },
        { provide: PushService, useValue: mockPushService },
        { provide: getModelToken(NotificationDelivery), useValue: mockNotificationDeliveryModel },
      ],
    }).compile();

    service = moduleRef.get<PushDispatchService>(PushDispatchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should do nothing when the publication has no company', async () => {
    mockPublicationService.getById.mockResolvedValue({ id: 10, companyId: null });

    await service.dispatch(baseEvent);

    expect(mockCompaniesService.getCompanyMemberUserIds).not.toHaveBeenCalled();
  });

  it('should do nothing when no device token exists for the company members', async () => {
    mockDeviceTokenService.getTokensByUserIds.mockResolvedValue([]);

    await service.dispatch(baseEvent);

    expect(mockPushService.sendPush).not.toHaveBeenCalled();
  });

  it('should send a push and log a SENT notification_delivery row per device token', async () => {
    await service.dispatch(baseEvent);

    expect(mockPushService.sendPush).toHaveBeenCalledWith(
      { id: 1, userId: 1, token: 'tok-1', platform: DeviceTokenPlatform.ANDROID },
      expect.objectContaining({ collapseId: 'publication:10' }),
    );
    expect(mockNotificationDeliveryModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        outboxEventId: 100,
        applicationId: 42,
        userId: 1,
        platform: DeviceTokenPlatform.ANDROID,
        channel: NotificationChannel.PUSH,
        status: NotificationDeliveryStatus.SENT,
      }),
    );
  });

  it('should log a FAILED notification_delivery row and keep the token when the push fails without being invalid', async () => {
    mockPushService.sendPush.mockResolvedValue({
      success: false,
      invalidToken: false,
      error: 'messaging/internal-error',
    });

    await service.dispatch(baseEvent);

    expect(mockNotificationDeliveryModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: NotificationDeliveryStatus.FAILED }),
    );
    expect(mockDeviceTokenService.removeToken).not.toHaveBeenCalled();
  });

  it('should remove the device token when the push result flags it as invalid', async () => {
    mockPushService.sendPush.mockResolvedValue({
      success: false,
      invalidToken: true,
      error: 'BadDeviceToken',
    });

    await service.dispatch(baseEvent);

    expect(mockDeviceTokenService.removeToken).toHaveBeenCalledWith('tok-1');
  });

  it('should keep dispatching to the remaining devices when one device throws', async () => {
    mockDeviceTokenService.getTokensByUserIds.mockResolvedValue([
      { id: 1, userId: 1, token: 'tok-1', platform: DeviceTokenPlatform.ANDROID },
      { id: 2, userId: 2, token: 'tok-2', platform: DeviceTokenPlatform.IOS },
    ]);
    mockNotificationDeliveryModel.create
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValueOnce(undefined);

    await expect(service.dispatch(baseEvent)).resolves.toBeUndefined();

    expect(mockPushService.sendPush).toHaveBeenCalledTimes(2);
    expect(mockNotificationDeliveryModel.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ userId: 2, platform: DeviceTokenPlatform.IOS }),
    );
  });
});
