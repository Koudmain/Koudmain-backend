import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';

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

  describe('constructor', () => {
    it('should throw an error if MAIL_FROM_EMAIL is missing', async () => {
      const badConfigServiceMock = {
        get: jest.fn((key: string) => {
          if (key === 'MAIL_FROM_NAME') return 'Koudmain';
          return undefined;
        }),
      };

      const modulePromise = Test.createTestingModule({
        providers: [
          MailerService,
          { provide: MAILJET_CLIENT, useValue: mailjetMock },
          { provide: ConfigService, useValue: badConfigServiceMock },
        ],
      }).compile();

      await expect(modulePromise).rejects.toThrow('Missing MAIL_FROM_EMAIL');
    });

    it('should initialize without MAIL_FROM_NAME if it is not provided', async () => {
      const minimalConfigServiceMock = {
        get: jest.fn((key: string) => {
          if (key === 'MAIL_FROM_EMAIL') return 'noreply@test.com';
          return undefined;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          MailerService,
          { provide: MAILJET_CLIENT, useValue: mailjetMock },
          { provide: ConfigService, useValue: minimalConfigServiceMock },
        ],
      }).compile();

      const minimalService = module.get(MailerService);
      expect(minimalService).toBeDefined();

      requestMock.mockResolvedValue(undefined);
      await minimalService.sendEmail({
        toEmail: 'user@test.com',
        subject: 'Hello',
        text: 'Hi!',
      });

      expect(requestMock).toHaveBeenCalledWith({
        Messages: [
          {
            From: { Email: 'noreply@test.com' },
            To: [{ Email: 'user@test.com' }],
            Subject: 'Hello',
            TextPart: 'Hi!',
          },
        ],
      });
    });
  });

  describe('sendEmail', () => {
    it('should send a text email via Mailjet', async () => {
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

    it('should send an HTML email via Mailjet', async () => {
      requestMock.mockResolvedValue(undefined);

      await service.sendEmail({
        toEmail: 'user@test.com',
        toName: 'User',
        subject: 'Hello',
        html: '<p>Hi!</p>',
      });

      expect(requestMock).toHaveBeenCalledWith({
        Messages: [
          {
            From: { Email: 'noreply@test.com', Name: 'Koudmain' },
            To: [{ Email: 'user@test.com', Name: 'User' }],
            Subject: 'Hello',
            HTMLPart: '<p>Hi!</p>',
          },
        ],
      });
    });

    it('should send both HTML and text email via Mailjet', async () => {
      requestMock.mockResolvedValue(undefined);

      await service.sendEmail({
        toEmail: 'user@test.com',
        toName: 'User',
        subject: 'Hello',
        text: 'Hi!',
        html: '<p>Hi!</p>',
      });

      expect(requestMock).toHaveBeenCalledWith({
        Messages: [
          {
            From: { Email: 'noreply@test.com', Name: 'Koudmain' },
            To: [{ Email: 'user@test.com', Name: 'User' }],
            Subject: 'Hello',
            TextPart: 'Hi!',
            HTMLPart: '<p>Hi!</p>',
          },
        ],
      });
    });

    it('should send an email with ReplyTo details', async () => {
      requestMock.mockResolvedValue(undefined);

      await service.sendEmail({
        toEmail: 'user@test.com',
        toName: 'User',
        subject: 'Hello',
        text: 'Hi!',
        replyToEmail: 'reply@test.com',
        replyToName: 'Reply Team',
      });

      expect(requestMock).toHaveBeenCalledWith({
        Messages: [
          {
            From: { Email: 'noreply@test.com', Name: 'Koudmain' },
            To: [{ Email: 'user@test.com', Name: 'User' }],
            Subject: 'Hello',
            TextPart: 'Hi!',
            ReplyTo: {
              Email: 'reply@test.com',
              Name: 'Reply Team',
            },
          },
        ],
      });
    });

    it('should send an email with ReplyTo email but no ReplyTo name', async () => {
      requestMock.mockResolvedValue(undefined);

      await service.sendEmail({
        toEmail: 'user@test.com',
        toName: 'User',
        subject: 'Hello',
        text: 'Hi!',
        replyToEmail: 'reply@test.com',
      });

      expect(requestMock).toHaveBeenCalledWith({
        Messages: [
          {
            From: { Email: 'noreply@test.com', Name: 'Koudmain' },
            To: [{ Email: 'user@test.com', Name: 'User' }],
            Subject: 'Hello',
            TextPart: 'Hi!',
            ReplyTo: {
              Email: 'reply@test.com',
            },
          },
        ],
      });
    });

    it('should throw InternalServerErrorException if both text and html are missing', async () => {
      await expect(
        service.sendEmail({
          toEmail: 'user@test.com',
          subject: 'Hello',
        }),
      ).rejects.toThrow(
        new InternalServerErrorException('Email content is empty (text/html/templateId)'),
      );
    });

    it('should throw InternalServerErrorException and log if Mailjet client fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      requestMock.mockRejectedValue(new Error('Mailjet API error'));

      await expect(
        service.sendEmail({
          toEmail: 'user@test.com',
          subject: 'Hello',
          text: 'Hi!',
        }),
      ).rejects.toThrow(new InternalServerErrorException('Failed to send email'));

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
