import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { DeviceTokenService } from './device-token.service';
import { DeviceToken, DeviceTokenPlatform } from '@/modules/push/models/device-token.model';

describe('DeviceTokenService', () => {
  let service: DeviceTokenService;
  let mockDeviceTokenModel: {
    findOne: jest.Mock;
    findAll: jest.Mock;
    create: jest.Mock;
    destroy: jest.Mock;
  };

  beforeEach(async () => {
    mockDeviceTokenModel = {
      findOne: jest.fn(),
      findAll: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
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

  it('should create a new device token when none exists for the given token', async () => {
    mockDeviceTokenModel.findOne.mockResolvedValue(null);
    mockDeviceTokenModel.create.mockResolvedValue({ id: 1 });

    await service.registerToken(1, 'abc', DeviceTokenPlatform.ANDROID);

    expect(mockDeviceTokenModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, token: 'abc', platform: DeviceTokenPlatform.ANDROID }),
    );
  });

  it('should update the owner and platform of an existing token instead of duplicating it', async () => {
    const existing = {
      userId: 2,
      platform: DeviceTokenPlatform.ANDROID,
      updatedAt: new Date(0),
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockDeviceTokenModel.findOne.mockResolvedValue(existing);

    await service.registerToken(3, 'abc', DeviceTokenPlatform.IOS);

    expect(existing.userId).toBe(3);
    expect(existing.platform).toBe(DeviceTokenPlatform.IOS);
    expect(existing.save).toHaveBeenCalled();
    expect(mockDeviceTokenModel.create).not.toHaveBeenCalled();
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
});
