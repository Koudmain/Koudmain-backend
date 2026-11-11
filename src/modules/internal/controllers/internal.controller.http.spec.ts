import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { InternalController } from './internal.controller';
import { InternalAuthGuard } from '@/modules/internal/internal-auth.guard';
import { NotificationDeliveryService } from '@/modules/internal/services/notification-delivery.service';
import { DeviceTokenService } from '@/modules/push/services/device-token.service';

const SECRET = 'test-internal-secret';

describe('InternalController (HTTP)', () => {
  let app: INestApplication;
  let mockDeviceTokenService: { getTokensByUserIds: jest.Mock; removeToken: jest.Mock };
  let mockNotificationDeliveryService: { create: jest.Mock };

  beforeAll(async () => {
    mockDeviceTokenService = {
      getTokensByUserIds: jest
        .fn()
        .mockResolvedValue([{ id: 3, userId: 1, token: 'tok-a', platform: 'IOS' }]),
      removeToken: jest.fn().mockResolvedValue(undefined),
    };
    mockNotificationDeliveryService = { create: jest.fn().mockResolvedValue({ id: 9 }) };

    const moduleRef = await Test.createTestingModule({
      controllers: [InternalController],
      providers: [
        InternalAuthGuard,
        { provide: ConfigService, useValue: { get: jest.fn(() => SECRET) } },
        { provide: DeviceTokenService, useValue: mockDeviceTokenService },
        { provide: NotificationDeliveryService, useValue: mockNotificationDeliveryService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    // Same validation setup as main.ts
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GET /internal/device-tokens returns 401 without the internal secret', async () => {
    await request(app.getHttpServer()).get('/internal/device-tokens?userIds=1').expect(401);
    expect(mockDeviceTokenService.getTokensByUserIds).not.toHaveBeenCalled();
  });

  it('GET /internal/device-tokens returns the tokens of the requested users', async () => {
    const response = await request(app.getHttpServer())
      .get('/internal/device-tokens?userIds=1,2,3')
      .set('X-Internal-Secret', SECRET)
      .expect(200);

    expect(mockDeviceTokenService.getTokensByUserIds).toHaveBeenCalledWith([1, 2, 3]);
    expect(response.body).toEqual([{ userId: 1, token: 'tok-a', platform: 'IOS' }]);
  });

  it('GET /internal/device-tokens returns 400 on invalid userIds', async () => {
    await request(app.getHttpServer())
      .get('/internal/device-tokens?userIds=1,abc')
      .set('X-Internal-Secret', SECRET)
      .expect(400);
  });

  it('DELETE /internal/device-tokens/:token returns 204', async () => {
    await request(app.getHttpServer())
      .delete(`/internal/device-tokens/${encodeURIComponent('abc:APA91b-x_y')}`)
      .set('X-Internal-Secret', SECRET)
      .expect(204);

    expect(mockDeviceTokenService.removeToken).toHaveBeenCalledWith('abc:APA91b-x_y');
  });

  it('POST /internal/notification-deliveries returns 201', async () => {
    const body = {
      outboxEventId: 123,
      applicationId: null,
      userId: 1,
      platform: 'ANDROID',
      channel: 'Push',
      status: 'Failed',
      errorMessage: 'messaging/internal-error',
    };

    await request(app.getHttpServer())
      .post('/internal/notification-deliveries')
      .set('X-Internal-Secret', SECRET)
      .send(body)
      .expect(201, { id: 9 });

    expect(mockNotificationDeliveryService.create).toHaveBeenCalledWith(body);
  });

  it('POST /internal/notification-deliveries returns 400 on an invalid body', async () => {
    await request(app.getHttpServer())
      .post('/internal/notification-deliveries')
      .set('X-Internal-Secret', SECRET)
      .send({ outboxEventId: 'x', unknownField: true })
      .expect(400);
  });
});
