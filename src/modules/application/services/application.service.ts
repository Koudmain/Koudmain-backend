import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Application, ApplicationStatus } from '@/modules/application/models/application.model';
import { Publication } from '@/modules/publication/models/publication.model';
import { CompanyMember } from '@/modules/companies/models/company-member.model';

export interface ApplicationFilters {
  status?: ApplicationStatus;
  publicationId?: number;
}

@Injectable()
export class ApplicationService {
  constructor(
    @InjectModel(Application) private readonly applicationModel: typeof Application,
    @InjectModel(Publication) private readonly publicationModel: typeof Publication,
    @InjectModel(CompanyMember) private readonly companyMemberModel: typeof CompanyMember,
  ) {}

  async findForUser(userId: number, filters: ApplicationFilters): Promise<Application[]> {
    const companyIds = filters.publicationId
      ? [await this.assertMemberOfPublicationCompany(userId, filters.publicationId)]
      : await this.getMemberCompanyIds(userId);

    return this.applicationModel.findAll({
      where: { ...(filters.status && { status: filters.status }) },
      include: [
        {
          model: Publication,
          attributes: ['id', 'title', 'companyId'],
          where: {
            companyId: companyIds,
            ...(filters.publicationId && { id: filters.publicationId }),
          },
        },
        {
          association: 'workerProfile',
          attributes: ['id'],
          include: [{ association: 'user', attributes: ['id', 'first_name', 'last_name'] }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Vérifie que l'utilisateur appartient à la company propriétaire de la publication.
   * Lève NotFoundException/ForbiddenException sinon ; retourne le companyId si ok.
   */
  async assertMemberOfPublicationCompany(userId: number, publicationId: number): Promise<number> {
    const publication = await this.publicationModel.findByPk(publicationId, {
      attributes: ['id', 'companyId'],
    });
    if (!publication) {
      throw new NotFoundException('Publication introuvable');
    }

    const isMember = await this.companyMemberModel.findOne({
      where: { userId, companyId: publication.companyId },
    });
    if (!isMember) {
      throw new ForbiddenException("Vous n'avez pas accès aux candidatures de cette publication");
    }

    return publication.companyId;
  }

  private async getMemberCompanyIds(userId: number): Promise<number[]> {
    const memberships = await this.companyMemberModel.findAll({
      where: { userId },
      attributes: ['companyId'],
    });
    return memberships.map((m) => m.companyId);
  }
}
