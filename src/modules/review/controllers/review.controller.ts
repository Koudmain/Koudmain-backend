import { Body, Controller, Param, ParseIntPipe, Post, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { ReviewService } from '@/modules/review/services/review.service';
import { CreateCompanyReviewDto, CreatePaymentReportDto } from '@/modules/review/dto/review.dto';

interface RequestWithUser extends ExpressRequest {
  user: {
    sub: number;
    email: string;
  };
}

@ApiTags('Review')
@ApiBearerAuth()
@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @ApiOperation({
    summary: 'Noter un établissement après une mission',
    description:
      "Permet au travailleur de laisser une note (1 à 5) et un commentaire sur l'établissement d'une mission terminée.",
  })
  @ApiParam({ name: 'missionId', description: 'ID numérique de la mission', type: Number })
  @ApiResponse({ status: 201, description: 'Avis enregistré.' })
  @ApiResponse({ status: 404, description: 'Mission terminée introuvable.' })
  @ApiResponse({ status: 409, description: 'Un avis existe déjà pour cette mission.' })
  @Post('mission/:missionId')
  async reviewCompany(
    @Request() req: RequestWithUser,
    @Param('missionId', ParseIntPipe) missionId: number,
    @Body() body: CreateCompanyReviewDto,
  ) {
    const userId = req.user.sub;
    const review = await this.reviewService.createCompanyReview(userId, missionId, body);

    return { message: 'Merci pour votre avis', id: review.id };
  }

  @ApiOperation({
    summary: 'Signaler un problème de paiement',
    description:
      "Permet au travailleur de signaler un retard ou un défaut de paiement de salaire sur une mission terminée, distinctement d'un avis.",
  })
  @ApiParam({ name: 'missionId', description: 'ID numérique de la mission', type: Number })
  @ApiResponse({ status: 201, description: 'Signalement transmis.' })
  @ApiResponse({ status: 404, description: 'Mission terminée introuvable.' })
  @Post('mission/:missionId/payment-report')
  async reportPayment(
    @Request() req: RequestWithUser,
    @Param('missionId', ParseIntPipe) missionId: number,
    @Body() body: CreatePaymentReportDto,
  ) {
    const userId = req.user.sub;
    const report = await this.reviewService.createPaymentReport(userId, missionId, body);

    return { message: 'Votre signalement a été transmis à Koudmain', id: report.id };
  }
}
