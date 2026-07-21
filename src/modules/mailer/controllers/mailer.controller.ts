import { Body, Controller, NotFoundException, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MailerService, SendEmailInput } from '@/modules/mailer/services/mailer.service';

@Controller('mailer')
export class MailerController {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  @Post('test')
  async sendTestEmail(@Body() body: SendEmailInput): Promise<{ ok: true }> {
    const nodeEnv = this.configService.get<string>('NODE_ENV') ?? 'development';
    const isExplicitlyEnabled =
      this.configService.get<string>('MAILER_TEST_ROUTE_ENABLED') === 'true';

    // Hide the route in production unless explicitly enabled.
    const enabled = nodeEnv !== 'production' || isExplicitlyEnabled;
    if (!enabled) {
      throw new NotFoundException('Mailer test route is disabled');
    }

    await this.mailerService.sendEmail(body);

    return { ok: true };
  }
}
