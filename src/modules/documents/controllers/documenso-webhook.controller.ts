import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { publicRoute } from '@/decorators/public.decorator';
import { DocumensoService } from '@/modules/documenso/services/documenso.service';
import type { DocumensoWebhookPayload } from '@/modules/documenso/documenso.types';
import { DocumentSignatureService } from '@/modules/documents/services/document-signature.service';

@ApiTags('Documenso')
@Controller('documenso')
export class DocumensoWebhookController {
  constructor(
    private readonly documensoService: DocumensoService,
    private readonly signatureService: DocumentSignatureService,
  ) {}

  @ApiOperation({
    summary: 'Recevoir les événements de signature Documenso',
    description:
      'Appelé par Documenso. Un contrat signé par toutes les parties est téléchargé, scellé sur S3 et marqué SIGNED. Un refus ou une annulation le repasse en brouillon.',
  })
  @ApiHeader({ name: 'X-Documenso-Secret', description: 'Secret configuré sur le webhook' })
  @ApiResponse({ status: 200, description: 'Événement traité.' })
  @ApiResponse({ status: 401, description: 'Secret absent ou invalide.' })
  @publicRoute()
  @HttpCode(HttpStatus.OK)
  @Post('webhook')
  async handle(
    @Headers('x-documenso-secret') secret: string | undefined,
    @Body() webhook: DocumensoWebhookPayload,
  ): Promise<void> {
    if (!this.documensoService.isValidWebhookSecret(secret)) {
      throw new UnauthorizedException('Secret de webhook invalide');
    }

    await this.signatureService.handleWebhook(webhook);
  }
}
