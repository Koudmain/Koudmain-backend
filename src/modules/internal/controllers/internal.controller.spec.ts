import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { InternalController } from './internal.controller';
import { InternalAuthGuard } from '@/modules/internal/internal-auth.guard';
import { NotificationDeliveryService } from '@/modules/internal/services/notification-delivery.service';
import { DeviceTokenService } from '@/modules/push/services/device-token.service';
import { DeviceTokenPlatform } from '@/modules/push/models/device-token.model';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
} from '@/modules/application/models/notification-delivery.model';
import { IS_PUBLIC_KEY } from '@/decorators/public.decorator';

describe('InternalController', () => {
  let controller: InternalController;
  let mockDeviceTokenService: { getTokensByUserIds: jest.Mock; removeToken: jest.Mock };
  let mockNotificationDeliveryService: { create: jest.Mock };

  beforeEach(async () => {
    mockDeviceTokenService = {
      getTokensByUserIds: jest.fn(),
      removeToken: jest.fn().mockResolvedValue(undefined),
    };
    mockNotificationDeliveryService = { create: jest.fn().mockResolvedValue({ id: 9 }) };

    const moduleRef = await Test.createTestingModule({
      controllers: [InternalController],
      providers: [
        { provide: DeviceTokenService, useValue: mockDeviceTokenService },
        { provide: NotificationDeliveryService, useValue: mockNotificationDeliveryService },
      ],
    })
      .overrideGuard(InternalAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = moduleRef.get<InternalController>(InternalController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should bypass the global JWT guard and be protected by the InternalAuthGuard', () => {
    const reflector = new Reflector();
    expect(reflector.get<boolean>(IS_PUBLIC_KEY, InternalController)).toBe(true);
    expect(Reflect.getMetadata(GUARDS_METADATA, InternalController)).toEqual([InternalAuthGuard]);
  });

  it('should return only userId, token and platform of the device tokens', async () => {
    mockDeviceTokenService.getTokensByUserIds.mockResolvedValue([
      {
        id: 1,
        userId: 1,
        token: 'tok-a',
        platform: DeviceTokenPlatform.IOS,
        createdAt: new Date(),
      },
      { id: 2, userId: 2, token: 'tok-b', platform: DeviceTokenPlatform.ANDROID },
    ]);

    const result = await controller.getDeviceTokens({ userIds: [1, 2, 3] });

    expect(mockDeviceTokenService.getTokensByUserIds).toHaveBeenCalledWith([1, 2, 3]);
    expect(result).toEqual([
      { userId: 1, token: 'tok-a', platform: DeviceTokenPlatform.IOS },
      { userId: 2, token: 'tok-b', platform: DeviceTokenPlatform.ANDROID },
    ]);
  });

  it('should remove the given device token', async () => {
    await expect(controller.removeDeviceToken('tok-a')).resolves.toBeUndefined();
    expect(mockDeviceTokenService.removeToken).toHaveBeenCalledWith('tok-a');
  });

  it('should create a notification delivery and return its id', async () => {
    const dto = {
      outboxEventId: 123,
      applicationId: 42,
      userId: 1,
      platform: DeviceTokenPlatform.ANDROID,
      channel: NotificationChannel.PUSH,
      status: NotificationDeliveryStatus.FAILED,
      errorMessage: 'messaging/internal-error',
    };

    const result = await controller.createNotificationDelivery(dto);

    expect(mockNotificationDeliveryService.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 9 });
  });
});
