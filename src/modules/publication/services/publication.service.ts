import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { PostPublicationDto, Publication } from '@/modules/publication/models/publication.model';
import { Skill } from '@/modules/skill/models/skill.model';

@Injectable()
export class PublicationService {
  constructor(@InjectModel(Publication) private publicationModel: typeof Publication) {}

  async create(publication: PostPublicationDto) {
    const maxId = await this.publicationModel.max('id');
    const nextId = (typeof maxId === 'number' ? maxId : 0) + 1;

    const { skills, ...pubData } = publication;

    const created = await this.publicationModel.create({
      ...pubData,
      id: nextId,
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

  async update(
    id: number,
    publication: Omit<Partial<Publication>, 'skills'> & { skills?: number[] },
  ) {
    const { skills, ...pubData } = publication;

    await this.publicationModel.update(pubData, { where: { id } });

    if (skills) {
      const existing = await this.publicationModel.findByPk(id);
      if (existing) {
        await existing.$set('skills', skills);
      }
    }

    return this.getById(id);
  }

  async delete(publication_id: number) {
    await this.publicationModel.destroy({
      where: {
        id: publication_id,
      },
    });
    return publication_id;
  }
}
