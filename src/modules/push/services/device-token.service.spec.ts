import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { DeviceTokenService } from './device-token.service';
import { DeviceToken } from '@/modules/push/models/device-token.model';
import { DeviceTokenPlatform } from '@/modules/push/models/device-token-platform.enum';

describe('DeviceTokenService', () => {
  let service: DeviceTokenService;
  let mockDeviceTokenModel: {
    upsert: jest.Mock;
    findAll: jest.Mock;
    destroy: jest.Mock;
  };

  beforeEach(async () => {
    mockDeviceTokenModel = {
      upsert: jest.fn(),
      findAll: jest.fn().mockResolvedValue([]),
      destroy: jest.fn().mockResolvedValue(1),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DeviceTokenService,
        { provide: getModelToken(DeviceToken), useValue: mockDeviceTokenModel },
      ],
    }).compile();

    service = moduleRef.get<DeviceTokenService>(DeviceTokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should register the token with a single upsert on the token column', async () => {
    const saved = { id: 1 };
    mockDeviceTokenModel.upsert.mockResolvedValue([saved, true]);

    const result = await service.registerToken(3, 'abc', DeviceTokenPlatform.IOS);

    expect(mockDeviceTokenModel.upsert).toHaveBeenCalledWith(
      { userId: 3, token: 'abc', platform: DeviceTokenPlatform.IOS, updatedAt: expect.any(Date) },
      { conflictFields: ['token'] },
    );
    expect(result).toBe(saved);
  });

  it('should return an empty array without querying when there are no user ids', async () => {
    const result = await service.getTokensByUserIds([]);
    expect(result).toEqual([]);
    expect(mockDeviceTokenModel.findAll).not.toHaveBeenCalled();
  });

  it('should fetch tokens for the given user ids', async () => {
    await service.getTokensByUserIds([1, 2]);
    expect(mockDeviceTokenModel.findAll).toHaveBeenCalledWith({ where: { userId: [1, 2] } });
  });

  it('should remove a token by its value', async () => {
    await service.removeToken('abc');
    expect(mockDeviceTokenModel.destroy).toHaveBeenCalledWith({ where: { token: 'abc' } });
  });

  it('should only remove the token when it belongs to the given user', async () => {
    await service.removeTokenForUser(7, 'abc');
    expect(mockDeviceTokenModel.destroy).toHaveBeenCalledWith({
      where: { token: 'abc', userId: 7 },
    });
  });

  it('should remove every token of the given user', async () => {
    await service.removeAllForUser(7);
    expect(mockDeviceTokenModel.destroy).toHaveBeenCalledWith({ where: { userId: 7 } });
  });
});
