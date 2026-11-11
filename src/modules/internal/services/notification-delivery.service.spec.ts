import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { NotificationDeliveryService } from './notification-delivery.service';
import {
  NotificationChannel,
  NotificationDelivery,
  NotificationDeliveryStatus,
} from '@/modules/application/models/notification-delivery.model';
import { DeviceTokenPlatform } from '@/modules/push/models/device-token.model';

describe('NotificationDeliveryService', () => {
  let service: NotificationDeliveryService;
  let mockNotificationDeliveryModel: { create: jest.Mock };

  beforeEach(async () => {
    mockNotificationDeliveryModel = { create: jest.fn().mockResolvedValue({ id: 1 }) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationDeliveryService,
        {
          provide: getModelToken(NotificationDelivery),
          useValue: mockNotificationDeliveryModel,
        },
      ],
    }).compile();

    service = moduleRef.get<NotificationDeliveryService>(NotificationDeliveryService);
  });

  it('should persist the notification delivery with all the provided fields', async () => {
    const result = await service.create({
      outboxEventId: 123,
      applicationId: 42,
      userId: 1,
      platform: DeviceTokenPlatform.IOS,
      channel: NotificationChannel.PUSH,
      status: NotificationDeliveryStatus.FAILED,
      errorMessage: 'BadDeviceToken',
    });

    expect(result).toEqual({ id: 1 });
    expect(mockNotificationDeliveryModel.create).toHaveBeenCalledWith({
      outboxEventId: 123,
      applicationId: 42,
      userId: 1,
      platform: DeviceTokenPlatform.IOS,
      channel: NotificationChannel.PUSH,
      status: NotificationDeliveryStatus.FAILED,
      errorMessage: 'BadDeviceToken',
      createdAt: expect.any(Date),
    });
  });

  it('should default applicationId and errorMessage to null', async () => {
    await service.create({
      outboxEventId: 123,
      userId: 1,
      platform: DeviceTokenPlatform.ANDROID,
      channel: NotificationChannel.PUSH,
      status: NotificationDeliveryStatus.SENT,
    });

    expect(mockNotificationDeliveryModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ applicationId: null, errorMessage: null }),
    );
  });
});
