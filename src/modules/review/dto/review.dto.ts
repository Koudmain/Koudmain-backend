import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentReportType } from '@/modules/review/models/payment-report.model';

export class CreateCompanyReviewDto {
  @ApiProperty({ example: 5, description: 'Note de 1 à 5' })
  @IsInt()
  @Min(1)
  @Max(5)
  declare rating: number;

  @ApiPropertyOptional({ example: 'Équipe accueillante, je recommande.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  declare comment?: string;

  @ApiPropertyOptional({ example: true, description: 'Paiement reçu dans les temps' })
  @IsOptional()
  @IsBoolean()
  declare paymentOnTime?: boolean;

  @ApiPropertyOptional({ example: true, description: "Mission conforme à l'annonce" })
  @IsOptional()
  @IsBoolean()
  declare missionMatchesListing?: boolean;
}

export class CreatePaymentReportDto {
  @ApiProperty({ enum: PaymentReportType, example: PaymentReportType.LATE_PAYMENT })
  @IsEnum(PaymentReportType)
  declare reportType: PaymentReportType;

  @ApiPropertyOptional({ example: 'Paiement reçu avec 10 jours de retard.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  declare description?: string;
}
