import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsEmail, IsOptional, IsString } from 'class-validator';
import { MAILJET_CLIENT } from '@/modules/mailer/mailer.constants';
import { buildEmailVerificationHtml } from '@/modules/mailer/templates/email-verification.template';

type MailjetSendMessage = {
  From: { Email: string; Name?: string };
  To: Array<{ Email: string; Name?: string }>;
  Subject: string;
  TextPart?: string;
  HTMLPart?: string;
  ReplyTo?: { Email: string; Name?: string };
  InlinedAttachments?: Array<{
    ContentType: string;
    Filename: string;
    ContentID: string;
    Base64Content: string;
  }>;
};

type MailjetSendPayload = {
  Messages: MailjetSendMessage[];
};

type MailjetClient = {
  post: (
    resource: 'send',
    options: { version: 'v3.1' },
  ) => {
    request: (payload: MailjetSendPayload) => Promise<void>;
  };
};

export class SendEmailInput {
  @IsEmail()
  toEmail!: string;

  @IsOptional()
  @IsString()
  toName?: string;

  @IsString()
  subject!: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  html?: string;

  @IsOptional()
  @IsEmail()
  replyToEmail?: string;

  @IsOptional()
  @IsString()
  replyToName?: string;
}

@Injectable()
export class MailerService {
  private readonly fromEmail: string;
  private readonly fromName?: string;

  constructor(
    @Inject(MAILJET_CLIENT) private readonly mailjet: MailjetClient,
    private readonly configService: ConfigService,
  ) {
    const fromEmail = this.configService.get<string>('MAIL_FROM_EMAIL');
    const fromName = this.configService.get<string>('MAIL_FROM_NAME');

    if (!fromEmail) {
      throw new Error('Missing MAIL_FROM_EMAIL');
    }

    this.fromEmail = fromEmail;
    this.fromName = fromName;
  }

  private getLogoBase64(): string {
    let logoPath = join(__dirname, 'templates', 'logo_black_transparant.png');
    if (!existsSync(logoPath)) {
      const fallbackPath = join(__dirname.replace(join('dist', 'src'), 'dist'), 'templates', 'logo_black_transparant.png');
      if (existsSync(fallbackPath)) {
        logoPath = fallbackPath;
      }
    }
    if (existsSync(logoPath)) {
      return readFileSync(logoPath).toString('base64');
    }
    return '';
  }

  async sendEmail(input: SendEmailInput): Promise<void> {
    if (!input.text && !input.html) {
      throw new InternalServerErrorException('Email content is empty (text/html)');
    }

    const logoBase64 = this.getLogoBase64();
    const message: MailjetSendMessage = {
      From: {
        Email: this.fromEmail,
        ...(this.fromName ? { Name: this.fromName } : {}),
      },
      To: [
        {
          Email: input.toEmail,
          ...(input.toName ? { Name: input.toName } : {}),
        },
      ],
      Subject: input.subject,
      ...(input.text ? { TextPart: input.text } : {}),
      ...(input.html ? { HTMLPart: input.html } : {}),
      ...(input.replyToEmail
        ? {
            ReplyTo: {
              Email: input.replyToEmail,
              ...(input.replyToName ? { Name: input.replyToName } : {}),
            },
          }
        : {}),
    };

    if (logoBase64 && input.html && input.html.includes('cid:logo')) {
      message.InlinedAttachments = [
        {
          ContentType: 'image/png',
          Filename: 'logo_black_transparant.png',
          ContentID: 'logo',
          Base64Content: logoBase64,
        },
      ];
    }

    const payload: MailjetSendPayload = {
      Messages: [message],
    };

    try {
      await this.mailjet.post('send', { version: 'v3.1' }).request(payload);
    } catch (error) {
      console.error('Mailjet send error:', error);
      throw new InternalServerErrorException('Failed to send email');
    }
  }

  async sendVerificationEmail(toEmail: string, firstName: string, code: string): Promise<void> {
    await this.sendEmail({
      toEmail,
      toName: firstName,
      subject: `${code} — Votre code de vérification Koudmain`,
      html: buildEmailVerificationHtml(firstName, code),
    });
  }
}
