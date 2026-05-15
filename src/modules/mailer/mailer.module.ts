import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Mailjet from 'node-mailjet';

import { MAILJET_CLIENT } from '@/modules/mailer/mailer.constants';
import { MailerController } from '@/modules/mailer/controllers/mailer.controller';
import { MailerService } from '@/modules/mailer/services/mailer.service';

type MailjetClient = {
  post: (
    resource: 'send',
    options: { version: 'v3.1' },
  ) => {
    request: (payload: { Messages: Array<Record<string, unknown>> }) => Promise<void>;
  };
};

type MailjetFactory = {
  apiConnect: (apiKey: string, apiSecret: string) => MailjetClient;
};

const MailjetClientFactory = Mailjet as unknown as MailjetFactory;

@Module({
  controllers: [MailerController],
  providers: [
    {
      provide: MAILJET_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): MailjetClient => {
        const apiKey = configService.get<string>('MAILJET_API_KEY');
        const apiSecret = configService.get<string>('MAILJET_SECRET_KEY');

        if (!apiKey) {
          throw new Error('Missing MAILJET_API_KEY');
        }
        if (!apiSecret) {
          throw new Error('Missing MAILJET_SECRET_KEY');
        }

        return MailjetClientFactory.apiConnect(apiKey, apiSecret);
      },
    },
    MailerService,
  ],
  exports: [MailerService],
})
export class MailerModule {}
