import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { MAILJET_CLIENT } from '@/modules/mailer/mailer.constants';
import { MailerService } from '@/modules/mailer/services/mailer.service';

describe('MailerService', () => {
  let service: MailerService;

  const requestMock = jest.fn();
  const postMock = jest.fn(() => ({ request: requestMock }));

  const mailjetMock = {
    post: postMock,
  };

  const configServiceMock = {
    get: jest.fn((key: string) => {
      if (key === 'MAIL_FROM_EMAIL') return 'noreply@test.com';
      if (key === 'MAIL_FROM_NAME') return 'Koudmain';
      return undefined;
    }),
  };

  beforeEach(async () => {
    requestMock.mockReset();
    postMock.mockClear();
    (configServiceMock.get as jest.Mock).mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailerService,
        { provide: MAILJET_CLIENT, useValue: mailjetMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get(MailerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send an email via Mailjet using text/html', async () => {
    requestMock.mockResolvedValue(undefined);

    await service.sendEmail({
      toEmail: 'user@test.com',
      toName: 'User',
      subject: 'Hello',
      text: 'Hi!',
    });

    expect(postMock).toHaveBeenCalledWith('send', { version: 'v3.1' });
    expect(requestMock).toHaveBeenCalledWith({
      Messages: [
        {
          From: { Email: 'noreply@test.com', Name: 'Koudmain' },
          To: [{ Email: 'user@test.com', Name: 'User' }],
          Subject: 'Hello',
          TextPart: 'Hi!',
        },
      ],
    });
  });

  it('should send an email via Mailjet using a template', async () => {
    requestMock.mockResolvedValue(undefined);

    await service.sendEmail({
      toEmail: 'user@test.com',
      toName: 'User',
      subject: 'Hello',
      templateId: 123456,
      variables: { name: 'John' },
    });

    expect(postMock).toHaveBeenCalledWith('send', { version: 'v3.1' });
    expect(requestMock).toHaveBeenCalledWith({
      Messages: [
        {
          From: { Email: 'noreply@test.com', Name: 'Koudmain' },
          To: [{ Email: 'user@test.com', Name: 'User' }],
          Subject: 'Hello',
          TemplateID: 123456,
          TemplateLanguage: true,
          Variables: { name: 'John' },
          TemplateErrorReporting: { Email: 'noreply@test.com', Name: 'Koudmain' },
          TemplateErrorDeliver: true,
        },
      ],
    });
  });

  it('should send verification email using template 8041377', async () => {
    requestMock.mockResolvedValue(undefined);

    await service.sendVerificationEmail('user@test.com', 'Jean', '123456');

    expect(postMock).toHaveBeenCalledWith('send', { version: 'v3.1' });
    expect(requestMock).toHaveBeenCalled();

    const calls = requestMock.mock.calls as unknown as unknown[][];
    const payload = calls[0][0] as {
      Messages: Array<{
        From: { Email: string; Name?: string };
        To: Array<{ Email: string; Name?: string }>;
        Subject?: string;
        TemplateID?: number;
        TemplateLanguage?: boolean;
        TemplateErrorReporting?: { Email: string; Name?: string };
        TemplateErrorDeliver?: boolean;
        Variables?: Record<string, string>;
      }>;
    };
    const message = payload.Messages[0];

    expect(message.From).toEqual({ Email: 'noreply@test.com', Name: 'Koudmain' });
    expect(message.To).toEqual([{ Email: 'user@test.com', Name: 'Jean' }]);
    expect(message.Subject).toBe('123456 — Votre code de vérification Koudmain');
    expect(message.TemplateID).toBe(8041377);
    expect(message.TemplateLanguage).toBe(true);
    expect(message.TemplateErrorReporting).toEqual({ Email: 'noreply@test.com', Name: 'Koudmain' });
    expect(message.TemplateErrorDeliver).toBe(true);

    expect(message.Variables).toBeDefined();
    const variables = message.Variables!;
    expect(variables.preHeader).toBe('123456 est votre code de vérification Koudmain');
    expect(variables.title).toBe('Confirmez votre adresse email');
    expect(variables.leadText).toBe(
      'Bonjour Jean,<br />Utilisez le code ci-dessous pour finaliser votre inscription sur Koudmain.',
    );
    expect(variables.contentHtml).toContain('123456');
    expect(variables.warningHtml).toContain("Si vous n'avez pas créé de compte");
    expect(variables.signature).toBe('Cordialement,<br />L’équipe Koudmain');
  });
});
