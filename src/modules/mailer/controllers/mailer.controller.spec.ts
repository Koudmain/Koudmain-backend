import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';

import { MailerController } from '@/modules/mailer/controllers/mailer.controller';
import { MailerService, SendEmailInput } from '@/modules/mailer/services/mailer.service';

describe('MailerController', () => {
  let controller: MailerController;

  const mailerServiceMock = {
    sendEmail: jest.fn(),
  };

  const configValues: Record<string, string | undefined> = {
    NODE_ENV: 'development',
    MAILER_TEST_ROUTE_ENABLED: undefined,
  };

  const configServiceMock = {
    get: jest.fn((key: string) => configValues[key]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    configValues.NODE_ENV = 'development';
    configValues.MAILER_TEST_ROUTE_ENABLED = undefined;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MailerController],
      providers: [
        { provide: MailerService, useValue: mailerServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    controller = module.get<MailerController>(MailerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendTestEmail', () => {
    const mockEmailInput: SendEmailInput = {
      toEmail: 'test@example.com',
      toName: 'Test User',
      subject: 'Test Subject',
      text: 'Test content',
    };

    it('should successfully send a test email in development mode', async () => {
      configValues.NODE_ENV = 'development';
      mailerServiceMock.sendEmail.mockResolvedValue(undefined);

      const result = await controller.sendTestEmail(mockEmailInput);

      expect(result).toEqual({ ok: true });
      expect(configServiceMock.get).toHaveBeenCalledWith('NODE_ENV');
      expect(configServiceMock.get).toHaveBeenCalledWith('MAILER_TEST_ROUTE_ENABLED');
      expect(mailerServiceMock.sendEmail).toHaveBeenCalledWith(mockEmailInput);
    });

    it('should successfully send a test email if NODE_ENV is undefined (defaults to development)', async () => {
      configValues.NODE_ENV = undefined;
      mailerServiceMock.sendEmail.mockResolvedValue(undefined);

      const result = await controller.sendTestEmail(mockEmailInput);

      expect(result).toEqual({ ok: true });
      expect(mailerServiceMock.sendEmail).toHaveBeenCalledWith(mockEmailInput);
    });

    it('should successfully send a test email in production mode if explicitly enabled', async () => {
      configValues.NODE_ENV = 'production';
      configValues.MAILER_TEST_ROUTE_ENABLED = 'true';
      mailerServiceMock.sendEmail.mockResolvedValue(undefined);

      const result = await controller.sendTestEmail(mockEmailInput);

      expect(result).toEqual({ ok: true });
      expect(mailerServiceMock.sendEmail).toHaveBeenCalledWith(mockEmailInput);
    });

    it('should throw NotFoundException in production mode if not explicitly enabled', async () => {
      configValues.NODE_ENV = 'production';
      configValues.MAILER_TEST_ROUTE_ENABLED = 'false';

      await expect(controller.sendTestEmail(mockEmailInput)).rejects.toThrow(
        new NotFoundException('Mailer test route is disabled'),
      );
      expect(mailerServiceMock.sendEmail).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException in production mode if MAILER_TEST_ROUTE_ENABLED is undefined', async () => {
      configValues.NODE_ENV = 'production';
      configValues.MAILER_TEST_ROUTE_ENABLED = undefined;

      await expect(controller.sendTestEmail(mockEmailInput)).rejects.toThrow(
        new NotFoundException('Mailer test route is disabled'),
      );
      expect(mailerServiceMock.sendEmail).not.toHaveBeenCalled();
    });
  });
});
