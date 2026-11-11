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

    it('should send a test email when MAILER_TEST_ROUTE_ENABLED is true', async () => {
      configValues.MAILER_TEST_ROUTE_ENABLED = 'true';
      mailerServiceMock.sendEmail.mockResolvedValue(undefined);

      const result = await controller.sendTestEmail(mockEmailInput);

      expect(result).toEqual({ ok: true });
      expect(configServiceMock.get).toHaveBeenCalledWith('MAILER_TEST_ROUTE_ENABLED');
      expect(mailerServiceMock.sendEmail).toHaveBeenCalledWith(mockEmailInput);
    });

    it.each([
      ['development', undefined],
      ['development', 'false'],
      [undefined, undefined],
      ['production', undefined],
      ['production', 'false'],
    ])(
      'should be disabled when NODE_ENV=%s and MAILER_TEST_ROUTE_ENABLED=%s',
      async (nodeEnv, enabled) => {
        configValues.NODE_ENV = nodeEnv;
        configValues.MAILER_TEST_ROUTE_ENABLED = enabled;

        await expect(controller.sendTestEmail(mockEmailInput)).rejects.toThrow(
          new NotFoundException('Mailer test route is disabled'),
        );
        expect(mailerServiceMock.sendEmail).not.toHaveBeenCalled();
      },
    );
  });
});
