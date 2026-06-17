import { Controller, Post, Body, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { DocumensoService } from '../services/documenso.service';

type DocumensoRecipient = {
  email?: string;
  status?: string;
  ipAddress?: string;
  userAgent?: string;
};

type DocumensoWebhookPayload = {
  event?: string;
  data?: {
    id?: string;
    status?: string;
    recipients?: DocumensoRecipient[];
  };
};

@Controller('documenso')
export class DocumensoController {
  constructor(private readonly documensoService: DocumensoService) {}
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  handleWebhook(@Body() payload: DocumensoWebhookPayload) {
    console.log('\n=============================================');
    console.log('       ⚡ WEBHOOK REÇU DE DOCUMENSO ⚡       ');
    console.log('=============================================');
    console.log(`Événement détecté : ${payload?.event}`);
    console.log(`ID du Document Documenso : ${payload?.data?.id}`);
    console.log(`Statut global : ${payload?.data?.status}`);

    // On affiche qui a signé et comment
    const recipients: DocumensoRecipient[] = payload?.data?.recipients ?? [];
    recipients.forEach((signer) => {
      console.log(`-> Signataire : ${signer.email} [Statut: ${signer.status}]`);
      if (signer.ipAddress) {
        console.log(`   IP de signature : ${signer.ipAddress}`);
        console.log(`   Appareil utilisé : ${signer.userAgent}`);
      }
    });

    // Si le document est totalement complété par tout le monde
    if (payload?.event === 'document.completed') {
      const downloadUrl = `http://localhost:3010/api/v1/documents/${payload?.data?.id}/download`;
      console.log('\n🎉 LE CONTRAT EST SCELLÉ ET VALIDE !');
      console.log(`🔗 URL directe pour voir/télécharger le PDF signé : ${downloadUrl}`);
    }

    console.log('=============================================\n');

    // On répond 200 à Documenso pour lui dire "C'est bon, j'ai reçu l'info"
    return { received: true };
  }

  @Get('test-signature')
  async triggerTest() {
    const urlSignature =
      await this.documensoService.createContractForSignature('tonemail@test.com');

    return { url: urlSignature };
  }
}
