import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PushService } from './push.service';
import { FIREBASE_APP, APNS_PROVIDER } from '@/modules/push/push.constants';
import { DeviceToken, DeviceTokenPlatform } from '@/modules/push/models/device-token.model';

const mockSend = jest.fn();
jest.mock('firebase-admin/messaging', () => ({
  getMessaging: () => ({ send: mockSend }),
}));

describe('PushService', () => {
  let service: PushService;
  let mockApnsProvider: { send: jest.Mock };
  let mockConfigService: { get: jest.Mock };

  const buildDeviceToken = (platform: DeviceTokenPlatform, token = 'token-1'): DeviceToken =>
    ({ token, platform }) as DeviceToken;

  beforeEach(async () => {
    mockApnsProvider = { send: jest.fn() };
    mockConfigService = { get: jest.fn().mockReturnValue('com.koudmain.app') };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PushService,
        { provide: FIREBASE_APP, useValue: {} },
        { provide: APNS_PROVIDER, useValue: mockApnsProvider },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = moduleRef.get<PushService>(PushService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should send via FCM for an ANDROID device token', async () => {
    mockSend.mockResolvedValue('message-id');

    const result = await service.sendPush(buildDeviceToken(DeviceTokenPlatform.ANDROID), {
      title: 't',
      body: 'b',
      collapseId: 'publication:1',
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'token-1',
        android: { collapseKey: 'publication:1' },
      }),
    );
    expect(result).toEqual({ success: true, invalidToken: false });
  });

  it('should flag an invalid FCM token on messaging/registration-token-not-registered', async () => {
    mockSend.mockRejectedValue({ code: 'messaging/registration-token-not-registered' });

    const result = await service.sendPush(buildDeviceToken(DeviceTokenPlatform.ANDROID), {
      title: 't',
      body: 'b',
      collapseId: 'publication:1',
    });

    expect(result).toEqual({
      success: false,
      invalidToken: true,
      error: 'messaging/registration-token-not-registered',
    });
  });

  it('should not flag the token invalid for an unrelated FCM error', async () => {
    mockSend.mockRejectedValue({ code: 'messaging/internal-error' });

    const result = await service.sendPush(buildDeviceToken(DeviceTokenPlatform.ANDROID), {
      title: 't',
      body: 'b',
      collapseId: 'publication:1',
    });

    expect(result.success).toBe(false);
    expect(result.invalidToken).toBe(false);
  });

  it('should send via APNs for an IOS device token', async () => {
    mockApnsProvider.send.mockResolvedValue({ sent: [{ device: 'token-1' }], failed: [] });

    const result = await service.sendPush(buildDeviceToken(DeviceTokenPlatform.IOS), {
      title: 't',
      body: 'b',
      collapseId: 'publication:1',
    });

    expect(mockApnsProvider.send).toHaveBeenCalled();
    expect(result).toEqual({ success: true, invalidToken: false });
  });

  it('should flag an invalid APNs token on BadDeviceToken', async () => {
    mockApnsProvider.send.mockResolvedValue({
      sent: [],
      failed: [{ device: 'token-1', response: { reason: 'BadDeviceToken' } }],
    });

    const result = await service.sendPush(buildDeviceToken(DeviceTokenPlatform.IOS), {
      title: 't',
      body: 'b',
      collapseId: 'publication:1',
    });

    expect(result).toEqual({ success: false, invalidToken: true, error: 'BadDeviceToken' });
  });

  it('should not flag the token invalid for an unrelated APNs failure reason', async () => {
    mockApnsProvider.send.mockResolvedValue({
      sent: [],
      failed: [{ device: 'token-1', response: { reason: 'PayloadTooLarge' } }],
    });

    const result = await service.sendPush(buildDeviceToken(DeviceTokenPlatform.IOS), {
      title: 't',
      body: 'b',
      collapseId: 'publication:1',
    });

    expect(result.invalidToken).toBe(false);
  });
});
