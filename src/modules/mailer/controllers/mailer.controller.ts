import { Body, Controller, NotFoundException, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MailerService, SendEmailInput } from '../services/mailer.service';

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

    // Enabled by default outside production.
    const enabled = nodeEnv !== 'production' || isExplicitlyEnabled;
    if (!enabled) {
      // Hide the route in production unless explicitly enabled.
      throw new NotFoundException();
    }

    const emailInput: SendEmailInput = {
      toEmail: body.toEmail,
      toName: body.toName,
      subject: body.subject || 'Mailer test',
      text: body.text || 'This is a test email sent via Mailjet.',
      html: body.html,
      replyToEmail: body.replyToEmail,
      replyToName: body.replyToName,
    };
    await this.mailerService.sendEmail(emailInput);

    return { ok: true };
  }
}
