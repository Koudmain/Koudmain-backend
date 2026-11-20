import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { PushDispatchService, PushDispatchRequest } from './push-dispatch.service';
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
  let mockDeviceTokenService: { getTokensByUserIds: jest.Mock; removeToken: jest.Mock };
  let mockPushService: { sendPush: jest.Mock };
  let mockNotificationDeliveryModel: { create: jest.Mock };

  const baseRequest: PushDispatchRequest = {
    recipientUserIds: [1, 2],
    outboxEventId: 100,
    applicationId: 42,
    payload: {
      title: 'Nouvelle candidature',
      body: 'Vous avez reçu une nouvelle candidature',
      collapseId: 'publication:10',
      data: { publicationId: '10' },
    },
  };

  beforeEach(async () => {
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

  it('should do nothing when there is no recipient', async () => {
    await service.dispatch({ ...baseRequest, recipientUserIds: [] });

    expect(mockDeviceTokenService.getTokensByUserIds).not.toHaveBeenCalled();
  });

  it('should do nothing when no device token exists for the recipients', async () => {
    mockDeviceTokenService.getTokensByUserIds.mockResolvedValue([]);

    await service.dispatch(baseRequest);

    expect(mockPushService.sendPush).not.toHaveBeenCalled();
  });

  it('should send a push and log a SENT notification_delivery row per device token', async () => {
    await service.dispatch(baseRequest);

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

  it('should default applicationId to null when the notification is not tied to an application', async () => {
    await service.dispatch({ ...baseRequest, applicationId: undefined });

    expect(mockNotificationDeliveryModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ applicationId: null }),
    );
  });

  it('should log a FAILED notification_delivery row and keep the token when the push fails without being invalid', async () => {
    mockPushService.sendPush.mockResolvedValue({
      success: false,
      invalidToken: false,
      error: 'messaging/internal-error',
    });

    await service.dispatch(baseRequest);

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

    await service.dispatch(baseRequest);

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

    await expect(service.dispatch(baseRequest)).resolves.toBeUndefined();

    expect(mockPushService.sendPush).toHaveBeenCalledTimes(2);
    expect(mockNotificationDeliveryModel.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ userId: 2, platform: DeviceTokenPlatform.IOS }),
    );
  });
});
