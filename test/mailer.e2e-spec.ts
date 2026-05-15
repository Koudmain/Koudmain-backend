import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { MailerModule } from '@/modules/mailer/mailer.module';
import { MAILJET_CLIENT } from '@/modules/mailer/mailer.constants';

describe('MailerController (e2e)', () => {
  let app: INestApplication;
  const requestMock = jest.fn();
  const postMock = jest.fn(() => ({ request: requestMock }));

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.MAIL_FROM_EMAIL = 'noreply@test.local';
    process.env.MAIL_FROM_NAME = 'Test Mailer';
    process.env.MAILER_TEST_ROUTE_ENABLED = 'true';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), MailerModule],
    })
      .overrideProvider(MAILJET_CLIENT)
      .useValue({ post: postMock })
      .overrideProvider(ConfigService)
      .useValue(new ConfigService())
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    requestMock.mockReset();
    postMock.mockClear();
  });

  it('should call the test route and send the email payload to Mailjet', async () => {
    requestMock.mockResolvedValue(undefined);

    const response = await request(app.getHttpServer()).post('/mailer/test').send({
      toEmail: 'dest@example.com',
      toName: 'Dest',
      subject: 'E2E Mailer',
      text: 'Hello from e2e',
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ ok: true });
    expect(postMock).toHaveBeenCalledWith('send', { version: 'v3.1' });
    expect(requestMock).toHaveBeenCalledWith({
      Messages: [
        {
          From: { Email: 'noreply@test.local', Name: 'Test Mailer' },
          To: [{ Email: 'dest@example.com', Name: 'Dest' }],
          Subject: 'E2E Mailer',
          TextPart: 'Hello from e2e',
        },
      ],
    });
  });
});
