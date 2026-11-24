import { Test } from '@nestjs/testing';
import { DeviceTokenController } from './device-token.controller';
import { DeviceTokenService } from '@/modules/push/services/device-token.service';
import { DeviceTokenPlatform } from '@/modules/push/models/device-token-platform.enum';

describe('DeviceTokenController', () => {
  let controller: DeviceTokenController;
  let mockDeviceTokenService: { registerToken: jest.Mock; removeTokenForUser: jest.Mock };

  beforeEach(async () => {
    mockDeviceTokenService = {
      registerToken: jest.fn().mockResolvedValue(undefined),
      removeTokenForUser: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [DeviceTokenController],
      providers: [{ provide: DeviceTokenService, useValue: mockDeviceTokenService }],
    }).compile();

    controller = moduleRef.get<DeviceTokenController>(DeviceTokenController);
  });

  it('should register the device token for the authenticated user', async () => {
    const req = { user: { sub: 7, email: 'a@b.com' } } as never;

    const result = await controller.register(req, {
      token: 'abc',
      platform: DeviceTokenPlatform.IOS,
    });

    expect(mockDeviceTokenService.registerToken).toHaveBeenCalledWith(
      7,
      'abc',
      DeviceTokenPlatform.IOS,
    );
    expect(result).toEqual({ success: true });
  });

  it('should unregister the device token only for the authenticated user', async () => {
    const req = { user: { sub: 7, email: 'a@b.com' } } as never;

    await controller.unregister(req, { token: 'abc' });

    expect(mockDeviceTokenService.removeTokenForUser).toHaveBeenCalledWith(7, 'abc');
  });
});
