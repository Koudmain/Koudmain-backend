import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import Mailjet from 'node-mailjet';

import { MAILJET_CLIENT } from '@/modules/mailer/mailer.constants';
import { MailerModule } from '@/modules/mailer/mailer.module';
import { MailerService } from '@/modules/mailer/services/mailer.service';

import { Module, Global } from '@nestjs/common';

@Global()
@Module({
  providers: [
    {
      provide: ConfigService,
      useValue: {
        get: (key: string) => {
          // Dynamic retrieval from configValues
          return configValuesRef[key];
        },
      },
    },
  ],
  exports: [ConfigService],
})
class GlobalConfigMockModule {}

let configValuesRef: Record<string, string | undefined> = {};

describe('MailerModule', () => {
  let apiConnectSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    configValuesRef = {
      MAILJET_API_KEY: 'test-api-key',
      MAILJET_SECRET_KEY: 'test-secret-key',
      MAIL_FROM_EMAIL: 'noreply@test.com',
      MAIL_FROM_NAME: 'Koudmain',
    };

    apiConnectSpy = jest.spyOn(Mailjet, 'apiConnect').mockReturnValue({
      post: jest.fn(),
    } as unknown as ReturnType<typeof Mailjet.apiConnect>);
  });

  afterEach(() => {
    apiConnectSpy.mockRestore();
  });

  const compileModule = async (): Promise<TestingModule> => {
    return Test.createTestingModule({
      imports: [GlobalConfigMockModule, MailerModule],
    }).compile();
  };

  it('should successfully compile the module and resolve MailerService', async () => {
    const module = await compileModule();
    const mailerService = module.get<MailerService>(MailerService);
    const mailjetClient = module.get<unknown>(MAILJET_CLIENT);

    expect(mailerService).toBeDefined();
    expect(mailjetClient).toBeDefined();
    expect(apiConnectSpy).toHaveBeenCalledWith('test-api-key', 'test-secret-key');
  });

  it('should throw an error during factory execution if MAILJET_API_KEY is missing', async () => {
    configValuesRef.MAILJET_API_KEY = undefined;

    await expect(compileModule()).rejects.toThrow('Missing MAILJET_API_KEY');
  });

  it('should throw an error during factory execution if MAILJET_SECRET_KEY is missing', async () => {
    configValuesRef.MAILJET_SECRET_KEY = undefined;

    await expect(compileModule()).rejects.toThrow('Missing MAILJET_SECRET_KEY');
  });
});
