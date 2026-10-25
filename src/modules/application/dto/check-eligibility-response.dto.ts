import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationErrorCode } from '@/modules/application/enums/application-error-code.enum';
import { WorkerDocumentType } from '@/modules/workers/models/worker-document.model';

export class CheckEligibilityResponseDto {
  @ApiProperty({
    description: 'Indicates whether the worker is eligible to apply for this publication',
    example: true,
  })
  canApply: boolean;

  @ApiPropertyOptional({
    description: 'Reason why the worker cannot apply',
    enum: ApplicationErrorCode,
    example: ApplicationErrorCode.KYC_REQUIRED,
  })
  reason?: ApplicationErrorCode;

  @ApiPropertyOptional({
    description: 'Human-readable explanation message',
    example: 'Documents KYC manquants ou non validés : NIR, PROOF_OF_ADDRESS, RIB.',
  })
  message?: string;

  @ApiPropertyOptional({
    description: 'List of missing or unverified KYC document types',
    enum: WorkerDocumentType,
    isArray: true,
    example: [WorkerDocumentType.NIR, WorkerDocumentType.PROOF_OF_ADDRESS, WorkerDocumentType.RIB],
  })
  missingDocuments?: WorkerDocumentType[];

  @ApiPropertyOptional({
    description: 'Percentage of required KYC documents that are verified (0 to 100)',
    example: 33,
  })
  completionPercentage?: number;
}
