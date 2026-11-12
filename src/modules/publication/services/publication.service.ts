import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import {
  PostPublicationDto,
  Publication,
  UpdatePublicationDto,
} from '@/modules/publication/models/publication.model';
import { Skill } from '@/modules/skill/models/skill.model';
import { CompanyMember } from '@/modules/companies/models/company-member.model';

@Injectable()
export class PublicationService {
  constructor(
    @InjectModel(Publication) private publicationModel: typeof Publication,
    @InjectModel(CompanyMember) private companyMemberModel: typeof CompanyMember,
  ) {}

  async create(userId: number, publication: PostPublicationDto) {
    await this.assertCompanyMember(userId, publication.companyId);

    const maxId = await this.publicationModel.max('id');
    const nextId = (typeof maxId === 'number' ? maxId : 0) + 1;

    const { skills, ...pubData } = publication;

    const created = await this.publicationModel.create({
      ...pubData,
      id: nextId,
      createdByUserId: userId,
      status: 'Ouverte',
      createdAt: new Date(),
      starting_date: publication.starting_date ?? new Date(),
      ending_date: publication.ending_date ?? new Date(),
    });

    if (skills && skills.length > 0) {
      await created.$set('skills', skills);
    }

    return this.getById(created.id) as Promise<Publication>;
  }

  async getAll() {
    return this.publicationModel.findAll({
      include: [Skill],
    });
  }

  async getById(id: number) {
    return this.publicationModel.findByPk(id, {
      include: [Skill],
    });
  }

  async update(userId: number, id: number, publication: UpdatePublicationDto) {
    const existing = await this.getOwnedPublication(userId, id);
    const { skills, ...pubData } = publication;

    await existing.update(pubData);

    if (skills) {
      await existing.$set('skills', skills);
    }

    return this.getById(id) as Promise<Publication>;
  }

  async delete(userId: number, publicationId: number) {
    const existing = await this.getOwnedPublication(userId, publicationId);
    await existing.destroy();
    return publicationId;
  }

  private async getOwnedPublication(userId: number, publicationId: number) {
    const publication = await this.publicationModel.findByPk(publicationId);
    if (!publication) throw new NotFoundException('Publication non trouvée');

    await this.assertCompanyMember(userId, publication.companyId);
    return publication;
  }

  private async assertCompanyMember(userId: number, companyId: number) {
    const membership = await this.companyMemberModel.findOne({ where: { userId, companyId } });
    if (!membership) {
      throw new ForbiddenException("Vous n'êtes pas membre de l'entreprise de cette publication");
    }
  }
}
