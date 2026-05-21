import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsEmail, IsOptional, IsString, IsNumber, IsObject } from 'class-validator';
import { MAILJET_CLIENT } from '@/modules/mailer/mailer.constants';

type MailjetSendMessage = {
  From: { Email: string; Name?: string };
  To: Array<{ Email: string; Name?: string }>;
  Subject?: string;
  TextPart?: string;
  HTMLPart?: string;
  TemplateID?: number;
  TemplateLanguage?: boolean;
  Variables?: Record<string, any>;
  TemplateErrorReporting?: { Email: string; Name?: string };
  TemplateErrorDeliver?: boolean;
  ReplyTo?: { Email: string; Name?: string };
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

  @IsOptional()
  @IsString()
  subject?: string;

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

  @IsOptional()
  @IsNumber()
  templateId?: number;

  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;
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

  async sendEmail(input: SendEmailInput): Promise<void> {
    if (!input.text && !input.html && !input.templateId) {
      throw new InternalServerErrorException('Email content is empty (text/html/templateId)');
    }

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
      ...(input.subject ? { Subject: input.subject } : {}),
      ...(input.replyToEmail
        ? {
            ReplyTo: {
              Email: input.replyToEmail,
              ...(input.replyToName ? { Name: input.replyToName } : {}),
            },
          }
        : {}),
    };

    if (input.templateId) {
      message.TemplateID = input.templateId;
      message.TemplateLanguage = true;
      if (input.variables) {
        message.Variables = input.variables;
      }
      message.TemplateErrorReporting = {
        Email: this.fromEmail,
        Name: this.fromName || 'Koudmain',
      };
      message.TemplateErrorDeliver = true;
    } else {
      if (input.text) message.TextPart = input.text;
      if (input.html) message.HTMLPart = input.html;
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
    const contentHtml = `
<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px 24px; margin: 0 auto 32px; display: inline-block; width: 100%; text-align: center;">
  <p style="font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #f97316; margin-bottom: 16px; margin-top: 0; font-family: 'Inter', Arial, sans-serif;">
    Votre code de vérification
  </p>
  <p style="font-size: 44px; font-weight: 800; letter-spacing: 12px; color: #0f172a; margin: 0; font-family: 'Plus Jakarta Sans', 'Inter', Arial, sans-serif; text-shadow: 0 0 10px rgba(216, 74, 34, 0.1); font-variant-numeric: tabular-nums;">
    ${code}
  </p>
  <p style="font-size: 13px; color: #64748b; margin-top: 12px; margin-bottom: 0; font-family: 'Inter', Arial, sans-serif;">
    Valide pendant <strong>15 minutes</strong>
  </p>
</div>
`;

    const warningHtml = `
<div class="warning">
  Si vous n'avez pas créé de compte sur Koudmain, ignorez cet email. Votre adresse ne sera pas enregistrée.
</div>
`;

    await this.sendEmail({
      toEmail,
      toName: firstName,
      subject: `${code} — Votre code de vérification Koudmain`,
      templateId: 8041377,
      variables: {
        preHeader: `${code} est votre code de vérification Koudmain`,
        title: 'Confirmez votre adresse email',
        leadText: `Bonjour ${firstName},<br />Utilisez le code ci-dessous pour finaliser votre inscription sur Koudmain.`,
        contentHtml,
        warningHtml,
        signature: 'Cordialement,<br />L’équipe Koudmain',
        year: new Date().getFullYear().toString(),
      },
    });
  }
}
