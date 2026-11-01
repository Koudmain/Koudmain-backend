import { IsString, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDocumentDto {
  @ApiPropertyOptional({ description: "Nouveau nom d'affichage" })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Montant HT (facture en brouillon uniquement)' })
  @IsNumber()
  @IsOptional()
  amountHt?: number;

  @ApiPropertyOptional({ description: 'Montant TTC (facture en brouillon uniquement)' })
  @IsNumber()
  @IsOptional()
  amountTtc?: number;

  @ApiPropertyOptional({ description: 'Frais de la plateforme (facture en brouillon uniquement)' })
  @IsNumber()
  @IsOptional()
  feeAmount?: number;
}
