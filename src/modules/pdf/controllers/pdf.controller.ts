import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { type Response } from 'express';
import { CdduContractData, CdduContractDataDto } from '@/modules/pdf/dtos/cddu-data.dto';
import { InvoiceDataDto } from '@/modules/pdf/dtos/invoice-data.dto';
import { PdfService } from '@/modules/pdf/services/pdf.service';

const TEMPLATE_DTO_MAP: Record<string, ClassConstructor<object>> = {
  cddu: CdduContractDataDto,
  invoice: InvoiceDataDto,
};

@ApiTags('PDF')
@ApiBearerAuth()
@Controller('pdf')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @ApiOperation({
    summary: 'Générer un exemple de contrat CDDU au format PDF',
    description:
      'Génère et retourne un exemple de contrat CDDU pré-rempli au format PDF pour test visuel ou prévisualisation directe.',
  })
  @ApiResponse({ status: 200, description: 'Fichier PDF généré avec succès.' })
  @ApiResponse({ status: 401, description: "Jeton d'authentification manquant ou invalide." })
  @ApiResponse({ status: 500, description: 'Erreur lors du rendu du PDF.' })
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

  @ApiOperation({
    summary: "Générer un document PDF dynamique à partir d'un template",
    description:
      'Génère un document PDF à partir du template spécifié (`cddu`, `invoice`) et des données transmises dans le body.',
  })
  @ApiParam({
    name: 'template',
    description: 'Nom du template Handlebars (ex: cddu, invoice)',
    example: 'cddu',
  })
  @ApiBody({
    description: 'Données nécessaires à la génération du PDF selon le template sélectionné.',
  })
  @ApiResponse({ status: 200, description: 'Fichier PDF généré avec succès.' })
  @ApiResponse({ status: 400, description: 'Nom de template inconnu ou données invalides.' })
  @ApiResponse({ status: 401, description: "Jeton d'authentification manquant ou invalide." })
  @ApiResponse({ status: 500, description: 'Erreur serveur lors de la génération du PDF.' })
  @HttpCode(HttpStatus.OK)
  @Post('generate/:template')
  async generatePdf(
    @Param('template') template: string,
    @Body() body: Record<string, unknown>,
    @Res() res: Response,
  ): Promise<void> {
    const templateKey = template.toLowerCase();

    if (!this.pdfService.templateExists(templateKey)) {
      const available = this.pdfService.getAvailableTemplates().join(', ');
      throw new BadRequestException(
        `Template PDF '${template}' introuvable. Templates disponibles : [${available}]`,
      );
    }

    const payloadData: Record<string, unknown> =
      typeof body?.data === 'object' && body.data !== null
        ? (body.data as Record<string, unknown>)
        : body;

    const dtoClass = TEMPLATE_DTO_MAP[templateKey];
    if (dtoClass) {
      const dtoInstance = plainToInstance(dtoClass, payloadData);
      const errors = await validate(dtoInstance);

      if (errors.length > 0) {
        const errorMessages = errors
          .map((err) => Object.values(err.constraints || {}).join(', '))
          .join('; ');
        throw new BadRequestException(
          `Données invalides pour le template '${templateKey}' : ${errorMessages}`,
        );
      }
    }

    const pdfBuffer = await this.pdfService.generatePdfFromTemplate(templateKey, payloadData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${templateKey}_${Date.now()}.pdf"`);
    res.end(pdfBuffer);
  }
}
