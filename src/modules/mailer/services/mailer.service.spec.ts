import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { MAILJET_CLIENT } from '@/modules/mailer/mailer.constants';
import { MailerService } from '@/modules/mailer/services/mailer.service';

describe('MailerService', () => {
  let service: MailerService;

  const requestMock = jest.fn();
  const postMock = jest.fn(() => ({ request: requestMock }));

  const mailjetMock = {
    post: postMock,
  };

  const configServiceMock = {
    get: jest.fn((key: string) => {
      if (key === 'MAIL_FROM_EMAIL') return 'noreply@test.com';
      if (key === 'MAIL_FROM_NAME') return 'Koudmain';
      return undefined;
    }),
  };

  beforeEach(async () => {
    requestMock.mockReset();
    postMock.mockClear();
    (configServiceMock.get as jest.Mock).mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailerService,
        { provide: MAILJET_CLIENT, useValue: mailjetMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get(MailerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send an email via Mailjet', async () => {
    requestMock.mockResolvedValue(undefined);

    await service.sendEmail({
      toEmail: 'user@test.com',
      toName: 'User',
      subject: 'Hello',
      text: 'Hi!',
    });

    expect(postMock).toHaveBeenCalledWith('send', { version: 'v3.1' });
    expect(requestMock).toHaveBeenCalledWith({
      Messages: [
        {
          From: { Email: 'noreply@test.com', Name: 'Koudmain' },
          To: [{ Email: 'user@test.com', Name: 'User' }],
          Subject: 'Hello',
          TextPart: 'Hi!',
        },
      ],
    });
  });
});
