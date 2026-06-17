import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DocumensoService {
  private readonly documensoApiUrl = 'http://192.168.1.51:3010/api/v2';
  private readonly fakeApiKey = '';

  async createContractForSignature(userEmail: string) {
    try {
      const pdfPath = path.resolve(process.cwd(), './pdf_test/test.pdf');

      if (!fs.existsSync(pdfPath)) {
        throw new Error("Le fichier 'test.pdf' est introuvable à la racine de ton projet NestJS.");
      }

      const pdfBuffer = fs.readFileSync(pdfPath);

      const formData = new FormData();

      const payload = {
        type: 'DOCUMENT',
        title: 'Contrat de Prestation Koudmain',
        recipients: [
          {
            email: userEmail,
            name: 'Prestataire Koudmain',
            role: 'SIGNER',
            fields: [
              {
                identifier: 0,
                type: 'SIGNATURE',
                page: 1,
                positionX: 10,
                positionY: 80,
                width: 30,
                height: 5,
              },
            ],
          },
        ],
      };
      formData.append('payload', JSON.stringify(payload));

      const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
      formData.append('files', pdfBlob, 'contract.pdf');

      const response = await fetch(`${this.documensoApiUrl}/envelope/create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.fakeApiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData: unknown = await response.json();
        throw new Error(`[V2] Erreur Documenso API: ${JSON.stringify(errorData)}`);
      }

      const { id: envelopeId } = (await response.json()) as { id: string };

      const distributeResponse = await fetch(`${this.documensoApiUrl}/envelope/distribute`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.fakeApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          envelopeId: envelopeId,
        }),
      });

      if (!distributeResponse.ok) {
        const errorData: unknown = await distributeResponse.json();
        throw new Error(`[V2] Erreur Distribution: ${JSON.stringify(errorData)}`);
      }

      const distributeData: { recipients?: { email: string; token?: string }[] } =
        (await distributeResponse.json()) as { recipients?: { email: string; token?: string }[] };
      const recipient = distributeData.recipients?.find((r) => r.email === userEmail);

      if (!recipient || !recipient.token) {
        throw new Error('Impossible de récupérer le token du signataire.');
      }

      const localIP = '192.168.1.51';
      return `http://${localIP}:3010/sign/${recipient.token}`;
    } catch (error) {
      console.error('Erreur NestJS V2 :', error);
      throw error;
    }
  }
}
