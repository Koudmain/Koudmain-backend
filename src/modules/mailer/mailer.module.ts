import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Mailjet from 'node-mailjet';

import { MAILJET_CLIENT } from './mailer.constants';
import { MailerController } from './controllers/mailer.controller';
import { MailerService } from './services/mailer.service';

type MailjetClient = ReturnType<(typeof Mailjet)['apiConnect']>;

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

        return Mailjet.apiConnect(apiKey, apiSecret);
      },
    },
    MailerService,
  ],
  exports: [MailerService],
})
export class MailerModule {}
