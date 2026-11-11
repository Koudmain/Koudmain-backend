import { Body, Controller, NotFoundException, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

import { MailerService, SendEmailInput } from '@/modules/mailer/services/mailer.service';

@ApiTags('Mailer')
@Controller('mailer')
export class MailerController {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  @ApiOperation({
    summary: 'Envoyer un email de test',
    description:
      "Route de test d'envoi d'email, active uniquement si MAILER_TEST_ROUTE_ENABLED=true.",
  })
  @ApiResponse({ status: 201, description: 'Email de test envoyé.' })
  @ApiResponse({
    status: 404,
    description: 'Route désactivée (MAILER_TEST_ROUTE_ENABLED != true).',
  })
  @Post('test')
  async sendTestEmail(@Body() body: SendEmailInput): Promise<{ ok: true }> {
    // Any signed-in user could send any HTML from our address: off unless explicitly enabled.
    if (this.configService.get<string>('MAILER_TEST_ROUTE_ENABLED') !== 'true') {
      throw new NotFoundException('Mailer test route is disabled');
    }

    await this.mailerService.sendEmail(body);

    return { ok: true };
  }
}
