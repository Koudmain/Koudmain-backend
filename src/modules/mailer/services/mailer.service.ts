import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsEmail, IsOptional, IsString, IsNumber, IsObject } from 'class-validator';
import {
  MAILJET_CLIENT,
  MAILJET_VERIFICATION_TEMPLATE_ID,
} from '@/modules/mailer/mailer.constants';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';

type MailjetSendMessage = {
  From: { Email: string; Name?: string };
  To: Array<{ Email: string; Name?: string }>;
  Subject?: string;
  TextPart?: string;
  HTMLPart?: string;
  TemplateID?: number;
  TemplateLanguage?: boolean;
  Variables?: Record<string, unknown>;
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
  @ApiProperty({ example: 'test@example.com', description: 'Adresse email du destinataire' })
  @IsEmail()
  toEmail!: string;

  @ApiPropertyOptional({ example: 'Jean Dupont', description: 'Nom du destinataire' })
  @IsOptional()
  @IsString()
  toName?: string;

  @ApiPropertyOptional({ example: 'Sujet du mail', description: 'Objet du message' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ example: 'Contenu en texte brut', description: 'Corps du mail (texte)' })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({ example: '<p>Contenu HTML</p>', description: 'Corps du mail (HTML)' })
  @IsOptional()
  @IsString()
  html?: string;

  @ApiPropertyOptional({ example: 'reply@example.com', description: 'Adresse email de réponse' })
  @IsOptional()
  @IsEmail()
  replyToEmail?: string;

  @ApiPropertyOptional({ example: 'Support', description: "Nom pour l'adresse de réponse" })
  @IsOptional()
  @IsString()
  replyToName?: string;

  @ApiPropertyOptional({ example: 12345, description: 'ID de template Mailjet' })
  @IsOptional()
  @IsNumber()
  templateId?: number;

  @ApiPropertyOptional({
    example: { code: '123456' },
    description: 'Variables dynamiques pour le template',
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;
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

  private loadTemplate(templateName: string, variables: Record<string, string> = {}): string {
    const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.html`);
    let content = fs.readFileSync(templatePath, 'utf8');

    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    return content;
  }

  async sendVerificationEmail(toEmail: string, firstName: string, code: string): Promise<void> {
    const contentHtml = this.loadTemplate('verification-content', { code });
    const warningHtml = this.loadTemplate('verification-warning');

    await this.sendEmail({
      toEmail,
      toName: firstName,
      subject: `${code} — Votre code de vérification Koudmain`,
      templateId: MAILJET_VERIFICATION_TEMPLATE_ID,
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
