import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Application, ApplicationStatus } from '../models/application.model';
import { Publication } from '@/modules/publication/models/publication.model';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { WorkerDocument, WorkerDocumentType } from '@/modules/workers/models/worker-document.model';
import { CompanyMember } from '@/modules/companies/models/company-member.model';
import { Company } from '@/modules/companies/models/company.model';
import { User } from '@/modules/users/models/user.model';
import { Address } from '@/modules/address/address.model';
import { WorkersService } from '@/modules/workers/services/workers.service';
import { ChatService } from '@/modules/chat/services/chat.service';
import { ApplyDto } from '../dto/apply.dto';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectModel(Application)
    private readonly applicationModel: typeof Application,
    @InjectModel(Publication)
    private readonly publicationModel: typeof Publication,
    @InjectModel(WorkerProfile)
    private readonly workerProfileModel: typeof WorkerProfile,
    @InjectModel(WorkerDocument)
    private readonly workerDocumentModel: typeof WorkerDocument,
    @InjectModel(CompanyMember)
    private readonly companyMemberModel: typeof CompanyMember,
    private readonly workersService: WorkersService,
    private readonly chatService: ChatService,
  ) {}

  /**
   * Check if the worker has a verified KYC document (identity document)
   */
  async checkWorkerKyc(workerId: number): Promise<boolean> {
    const doc = await this.workerDocumentModel.findOne({
      where: {
        workerId,
        type: WorkerDocumentType.IDENTITY,
        verified: true,
      },
    });
    return !!doc;
  }

  /**
   * Apply to a publication (job offer) as a worker. This method checks for KYC verification if required, ensures the publication exists and is not expired, checks for existing applications, and creates a new application. If a message is provided, it also creates a chat conversation and sends the message to the company.
   * @param userId - The ID of the user (worker) applying
   * @param dto - The application data transfer object containing publicationId and optional message
   * @param requireKyc - Whether to enforce KYC verification (default: false)
   * @returns The created Application instance
   */
  async apply(userId: number, dto: ApplyDto): Promise<Application> {
    const worker = await this.workersService.getWorkerByUserId(userId);
    if (!worker) {
      throw new NotFoundException('Profil travailleur introuvable');
    }

    // Check if the worker has a verified identity document
    const isVerified = await this.checkWorkerKyc(worker.id);
    if (!isVerified) {
      throw new ForbiddenException(
        "Votre pièce d'identité (KYC) doit être validée pour pouvoir postuler.",
      );
    }

    // Check if the publication exists
    const publication = await this.publicationModel.findByPk(dto.publicationId);
    if (!publication) {
      throw new NotFoundException('Offre introuvable');
    }

    // Check if the publication has expired
    if (publication.ending_date && new Date(publication.ending_date) < new Date()) {
      throw new BadRequestException('Cette offre a déjà expiré');
    }

    // Check if the worker has already applied to this publication
    const existingApplication = await this.applicationModel.findOne({
      where: {
        publicationId: dto.publicationId,
        workerId: worker.id,
      },
    });
    if (existingApplication) {
      throw new ConflictException('Vous avez déjà postulé à cette offre');
    }

    // Create the application
    const application = await this.applicationModel.create({
      publicationId: dto.publicationId,
      workerId: worker.id,
      status: ApplicationStatus.PENDING,
      createdAt: new Date(),
    });

    // If a message is provided, create a chat conversation and send the message to the company
    if (dto.message && dto.message.trim().length > 0 && publication.companyId) {
      try {
        const conversation = await this.chatService.findOrCreateConversation(
          publication.id,
          worker.id,
          publication.companyId,
        );
        await this.chatService.sendMessage(userId, conversation.id, dto.message.trim());
      } catch (error) {
        // Log l'erreur mais ne pas faire échouer la création de la candidature si le chat a un souci
        console.error("Erreur lors de l'envoi du message de candidature:", error);
      }
    }

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
      throw new NotFoundException('Profil travailleur introuvable');
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
      throw new NotFoundException('Offre introuvable');
    }

    // Verify rights: the user must be a member of the company or the creator of the publication
    const isMember = await this.companyMemberModel.findOne({
      where: {
        companyId: publication.companyId,
        userId,
      },
    });

    if (!isMember && publication.createdByUserId !== userId) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à consulter les candidatures de cette offre",
      );
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
      throw new NotFoundException('Candidature introuvable');
    }

    // Verify rights: the user must be a member of the company or the creator of the publication
    const isMember = await this.companyMemberModel.findOne({
      where: {
        companyId: application.publication.companyId,
        userId,
      },
    });

    if (!isMember && application.publication.createdByUserId !== userId) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à modifier le statut de cette candidature",
      );
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
      throw new NotFoundException('Profil travailleur introuvable');
    }

    const application = await this.applicationModel.findByPk(applicationId);
    if (!application) {
      throw new NotFoundException('Candidature introuvable');
    }

    if (application.workerId !== worker.id) {
      throw new ForbiddenException('Vous ne pouvez annuler que vos propres candidatures');
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException("Impossible d'annuler une candidature déjà traitée");
    }

    await application.destroy();
    return { message: 'Candidature annulée avec succès' };
  }
}
