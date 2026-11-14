import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { DocumensoWebhookController } from './documenso-webhook.controller';
import { DocumensoService } from '@/modules/documenso/services/documenso.service';
import { DocumentSignatureService } from '@/modules/documents/services/document-signature.service';
import {
  DocumensoWebhookEvent,
  DocumensoWebhookPayload,
} from '@/modules/documenso/documenso.types';

jest.mock('@/modules/pdf/services/pdf.service', () => ({ PdfService: class PdfService {} }));

describe('DocumensoWebhookController', () => {
  let controller: DocumensoWebhookController;

  const mockDocumensoService = { isValidWebhookSecret: jest.fn() };
  const mockSignatureService = { handleWebhook: jest.fn() };

  const webhook: DocumensoWebhookPayload = {
    event: DocumensoWebhookEvent.DOCUMENT_COMPLETED,
    payload: { envelopeId: 'env-1', externalId: '42', status: 'COMPLETED' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumensoWebhookController],
      providers: [
        { provide: DocumensoService, useValue: mockDocumensoService },
        { provide: DocumentSignatureService, useValue: mockSignatureService },
      ],
    }).compile();

    controller = module.get<DocumensoWebhookController>(DocumensoWebhookController);

    jest.resetAllMocks();
  });

  it('doit traiter un webhook dont le secret est valide', async () => {
    mockDocumensoService.isValidWebhookSecret.mockReturnValue(true);

    await expect(controller.handle('secret', webhook)).resolves.toBeUndefined();
    expect(mockDocumensoService.isValidWebhookSecret).toHaveBeenCalledWith('secret');
    expect(mockSignatureService.handleWebhook).toHaveBeenCalledWith(webhook);
  });

  it.each([undefined, 'mauvais-secret'])('doit refuser le secret %p', async (secret) => {
    mockDocumensoService.isValidWebhookSecret.mockReturnValue(false);

    await expect(controller.handle(secret, webhook)).rejects.toThrow(UnauthorizedException);
    expect(mockSignatureService.handleWebhook).not.toHaveBeenCalled();
  });
});
