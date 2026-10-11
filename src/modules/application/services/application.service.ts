import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Application, ApplicationStatus } from '@/modules/application/models/application.model';
import { Publication } from '@/modules/publication/models/publication.model';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { WorkerDocument, WorkerDocumentType } from '@/modules/workers/models/worker-document.model';
import { CompanyMember } from '@/modules/companies/models/company-member.model';
import { Company } from '@/modules/companies/models/company.model';
import { User } from '@/modules/users/models/user.model';
import { Address } from '@/modules/address/address.model';
import { WorkersService } from '@/modules/workers/services/workers.service';
import { ChatService } from '@/modules/chat/services/chat.service';
import { ApplyDto } from '@/modules/application/dto/apply.dto';
import { CheckEligibilityResponseDto } from '@/modules/application/dto/check-eligibility-response.dto';
import { ApplicationErrorCode } from '@/modules/application/enums/application-error-code.enum';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectModel(Application)
    private readonly applicationModel: typeof Application,
    @InjectModel(Publication)
    private readonly publicationModel: typeof Publication,
    @InjectModel(WorkerDocument)
    private readonly workerDocumentModel: typeof WorkerDocument,
    @InjectModel(CompanyMember)
    private readonly companyMemberModel: typeof CompanyMember,
    private readonly workersService: WorkersService,
    private readonly chatService: ChatService,
  ) {}

  /**
   * Check if the worker has completed all required KYC documents (IDENTITY, NIR, PROOF_OF_ADDRESS, RIB)
   * @param workerId - The ID of the worker
   * @returns An object indicating whether KYC is complete and listing any missing or unverified document types
   */
  async checkWorkerKyc(
    workerId: number,
  ): Promise<{ isComplete: boolean; missing: WorkerDocumentType[] }> {
    const requiredTypes: WorkerDocumentType[] = [
      WorkerDocumentType.IDENTITY,
      WorkerDocumentType.NIR,
      WorkerDocumentType.PROOF_OF_ADDRESS,
      WorkerDocumentType.RIB,
    ];

    const verifiedDocs = await this.workerDocumentModel.findAll({
      where: {
        workerId,
        type: requiredTypes,
        verified: true,
      },
    });

    const verifiedTypes = new Set(verifiedDocs.map((d) => d.type as WorkerDocumentType));
    const missing = requiredTypes.filter((type) => !verifiedTypes.has(type));

    return {
      isComplete: missing.length === 0,
      missing,
    };
  }

  /**
   * Check if a worker is eligible to apply for a publication (KYC complete, not expired, not already applied).
   * @param userId - The ID of the user (worker) checking eligibility
   * @param publicationId - The ID of the publication to check
   * @returns An object indicating whether the worker can apply and any reasons/missing documents if not
   */
  async checkEligibility(
    userId: number,
    publicationId: number,
  ): Promise<CheckEligibilityResponseDto> {
    const worker = await this.workersService.getWorkerByUserId(userId);
    if (!worker) {
      throw new NotFoundException({
        code: ApplicationErrorCode.WORKER_PROFILE_NOT_FOUND,
        message: 'Profil travailleur introuvable',
      });
    }

    const publication = await this.publicationModel.findByPk(publicationId);
    if (!publication) {
      throw new NotFoundException({
        code: ApplicationErrorCode.PUBLICATION_NOT_FOUND,
        message: 'Offre introuvable',
      });
    }

    // Check if the publication has expired
    if (publication.ending_date && new Date(publication.ending_date) < new Date()) {
      return {
        canApply: false,
        reason: ApplicationErrorCode.OFFER_EXPIRED,
        message: 'Cette offre a déjà expiré',
      };
    }

    // Check if the worker has already applied to this publication
    const existingApplication = await this.applicationModel.findOne({
      where: {
        publicationId,
        workerId: worker.id,
      },
    });
    if (existingApplication) {
      return {
        canApply: false,
        reason: ApplicationErrorCode.ALREADY_APPLIED,
        message: 'Vous avez déjà postulé à cette offre',
      };
    }

    // Check if the worker has completed all required KYC documents
    const kycResult = await this.checkWorkerKyc(worker.id);
    if (!kycResult.isComplete) {
      return {
        canApply: false,
        reason: ApplicationErrorCode.KYC_REQUIRED,
        message: `Documents KYC manquants ou non validés : ${kycResult.missing.join(', ')}.`,
        missingDocuments: kycResult.missing,
      };
    }

    return {
      canApply: true,
    };
  }

  /**
   * Apply to a publication (job offer) as a worker. This method checks for full KYC verification, ensures the publication exists and is not expired, checks for existing applications, and creates a new application. If a message is provided, it sends the message to the company first.
   * @param userId - The ID of the user (worker) applying
   * @param dto - The application data transfer object containing publicationId and optional message
   * @returns The created Application instance
   */
  async apply(userId: number, dto: ApplyDto): Promise<Application> {
    const worker = await this.workersService.getWorkerByUserId(userId);
    if (!worker) {
      throw new NotFoundException({
        code: ApplicationErrorCode.WORKER_PROFILE_NOT_FOUND,
        message: 'Profil travailleur introuvable',
      });
    }

    // Check if the worker has fully completed and verified their KYC
    const kycResult = await this.checkWorkerKyc(worker.id);
    if (!kycResult.isComplete) {
      throw new ForbiddenException({
        code: ApplicationErrorCode.KYC_REQUIRED,
        message: `Documents KYC manquants ou non validés : ${kycResult.missing.join(', ')}.`,
        missingDocuments: kycResult.missing,
      });
    }

    // Check if the publication exists
    const publication = await this.publicationModel.findByPk(dto.publicationId);
    if (!publication) {
      throw new NotFoundException({
        code: ApplicationErrorCode.PUBLICATION_NOT_FOUND,
        message: 'Offre introuvable',
      });
    }

    // Check if the publication has expired
    if (publication.ending_date && new Date(publication.ending_date) < new Date()) {
      throw new BadRequestException({
        code: ApplicationErrorCode.OFFER_EXPIRED,
        message: 'Cette offre a déjà expiré',
      });
    }

    // Check if the worker has already applied to this publication
    const existingApplication = await this.applicationModel.findOne({
      where: {
        publicationId: dto.publicationId,
        workerId: worker.id,
      },
    });
    if (existingApplication) {
      throw new ConflictException({
        code: ApplicationErrorCode.ALREADY_APPLIED,
        message: 'Vous avez déjà postulé à cette offre',
      });
    }

    // Check message length limit (150 chars maximum)
    if (dto.message && dto.message.length > 150) {
      throw new BadRequestException({
        code: ApplicationErrorCode.MESSAGE_TOO_LONG,
        message: 'Le message ne doit pas dépasser 150 caractères',
      });
    }

    // If a message is provided, create a chat conversation and send the message to the company FIRST
    if (dto.message && dto.message.trim().length > 0 && publication.companyId) {
      const conversation = await this.chatService.findOrCreateConversation(
        publication.id,
        worker.id,
        publication.companyId,
      );
      await this.chatService.sendMessage(userId, conversation.id, dto.message.trim());
    }

    // Create the application after the message has been sent
    const application = await this.applicationModel.create({
      publicationId: dto.publicationId,
      workerId: worker.id,
      status: ApplicationStatus.PENDING,
      createdAt: new Date(),
    });

    return application;
  }

  /**
   * List all applications made by the worker (current user)
   * @param userId - The ID of the user (worker)
   * @returns An array of Application instances
   */
  async getMyApplications(userId: number): Promise<Application[]> {
    const worker = await this.workersService.getWorkerByUserId(userId);
    if (!worker) {
      throw new NotFoundException({
        code: ApplicationErrorCode.WORKER_PROFILE_NOT_FOUND,
        message: 'Profil travailleur introuvable',
      });
    }

    return this.applicationModel.findAll({
      where: { workerId: worker.id },
      include: [
        {
          model: Publication,
          include: [Company, Address],
        },
      ],
      order: [['created_at', 'DESC']],
    });
  }

  /**
   * Get all applications for a specific publication (job offer). This method checks if the publication exists and verifies that the user has the right to view the applications (either as a member of the company or as the creator of the publication).
   * @param userId - The ID of the user requesting the applications
   * @param publicationId - The ID of the publication
   * @returns An array of Application instances
   */
  async getApplicationsByPublication(
    userId: number,
    publicationId: number,
  ): Promise<Application[]> {
    const publication = await this.publicationModel.findByPk(publicationId);
    if (!publication) {
      throw new NotFoundException({
        code: ApplicationErrorCode.PUBLICATION_NOT_FOUND,
        message: 'Offre introuvable',
      });
    }

    // Verify rights: the user must be a member of the company or the creator of the publication
    const isMember = await this.companyMemberModel.findOne({
      where: {
        companyId: publication.companyId,
        userId,
      },
    });

    if (!isMember && publication.createdByUserId !== userId) {
      throw new ForbiddenException({
        code: ApplicationErrorCode.NOT_AUTHORIZED,
        message: "Vous n'êtes pas autorisé à consulter les candidatures de cette offre",
      });
    }

    return this.applicationModel.findAll({
      where: { publicationId },
      include: [
        {
          model: WorkerProfile,
          include: [
            {
              model: User,
              attributes: { exclude: ['password'] },
            },
          ],
        },
      ],
      order: [['created_at', 'DESC']],
    });
  }

  /**
   * Update the status of an application (accept or reject). This method checks if the application exists and verifies that the user has the right to update the status (either as a member of the company or as the creator of the publication).
   * @param userId - The ID of the user updating the status
   * @param applicationId - The ID of the application to update
   * @param status - The new status (ACCEPTED or REJECTED)
   * @returns The updated Application instance
   */
  async updateStatus(
    userId: number,
    applicationId: number,
    status: ApplicationStatus,
  ): Promise<Application> {
    const application = await this.applicationModel.findByPk(applicationId, {
      include: [Publication],
    });

    if (!application) {
      throw new NotFoundException({
        code: ApplicationErrorCode.APPLICATION_NOT_FOUND,
        message: 'Candidature introuvable',
      });
    }

    // Verify rights: the user must be a member of the company or the creator of the publication
    const isMember = await this.companyMemberModel.findOne({
      where: {
        companyId: application.publication.companyId,
        userId,
      },
    });

    if (!isMember && application.publication.createdByUserId !== userId) {
      throw new ForbiddenException({
        code: ApplicationErrorCode.NOT_AUTHORIZED,
        message: "Vous n'êtes pas autorisé à modifier le statut de cette candidature",
      });
    }

    application.status = status;
    await application.save();

    return application;
  }

  /**
   * Cancel one's own application (as long as it is pending)
   * @param userId - The ID of the user canceling the application
   * @param applicationId - The ID of the application to cancel
   * @returns A message indicating the success of the cancellation
   */
  async cancel(userId: number, applicationId: number): Promise<{ message: string }> {
    const worker = await this.workersService.getWorkerByUserId(userId);
    if (!worker) {
      throw new NotFoundException({
        code: ApplicationErrorCode.WORKER_PROFILE_NOT_FOUND,
        message: 'Profil travailleur introuvable',
      });
    }

    const application = await this.applicationModel.findByPk(applicationId);
    if (!application) {
      throw new NotFoundException({
        code: ApplicationErrorCode.APPLICATION_NOT_FOUND,
        message: 'Candidature introuvable',
      });
    }

    if (application.workerId !== worker.id) {
      throw new ForbiddenException({
        code: ApplicationErrorCode.NOT_AUTHORIZED,
        message: 'Vous ne pouvez annuler que vos propres candidatures',
      });
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException({
        code: ApplicationErrorCode.CANNOT_CANCEL_PROCESSED,
        message: "Impossible d'annuler une candidature déjà traitée",
      });
    }

    await application.destroy();
    return { message: 'Candidature annulée avec succès' };
  }
}
