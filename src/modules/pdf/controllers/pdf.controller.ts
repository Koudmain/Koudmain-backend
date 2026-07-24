import { Controller, Get, Res, Header, HttpCode, HttpStatus } from '@nestjs/common';
import { type Response } from 'express';
import { PdfService } from '../services/pdf.service';
import { CdduContractData } from '../dtos/cddu-data.dto';

@Controller('pdf')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  // GET /pdf/test-cddu
  @HttpCode(HttpStatus.OK)
  @Get('test-cddu')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'inline; filename="cddu_sample.pdf"')
  async generateSampleCddu(@Res() res: Response): Promise<void> {
    const sampleData: CdduContractData = {
      contractRef: 'CDDU-2026-001',
      createdDate: '24/07/2026',
      employer: {
        name: 'Koudmain SAS',
        siret: '123 456 789 00012',
        address: "10 Rue de l'Innovation, 75001 Paris",
        representative: 'Jean Dupont (Président)',
      },
      employee: {
        firstName: 'Thomas',
        lastName: 'Martin',
        nir: '1 92 05 75 012 345 67',
        birthDate: '15/05/1992',
        address: '42 Avenue de la République, 75011 Paris',
      },
      jobTitle: 'Serveur en Restauration',
      missionDescription:
        "Service en salle et accueil des clients lors d'un événement d'entreprise.",
      startDate: '01/08/2026 à 18:00',
      endDate: '01/08/2026 à 23:30',
      totalHours: 5.5,
      hourlyRate: 15.5,
      totalGrossSalary: 85.25,
      missionLocation: 'Grand Hôtel de Paris, 75009 Paris',
    };

    const pdfBuffer = await this.pdfService.generateCddu(sampleData);
    res.end(pdfBuffer);
  }
}
