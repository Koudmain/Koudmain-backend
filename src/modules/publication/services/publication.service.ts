import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Publication } from '../models/publication.model';

@Injectable()
export class PublicationService {
  constructor(@InjectModel(Publication) private publicationModel: typeof Publication) {}

  async create(publication: Partial<Publication>) {
    const maxId = await this.publicationModel.max('id');
    const nextId = publication.id ?? (typeof maxId === 'number' ? maxId : 0) + 1;

    return this.publicationModel.create({
      ...publication,
      id: nextId,
      create_at: publication.createdAt ?? new Date(),
      starting_date: publication.starting_date ?? new Date(),
      ending_date: publication.ending_date ?? new Date(),
    });
  }

  async getAll() {
    return this.publicationModel.findAll();
  }

  async getById(id: number) {
    return this.publicationModel.findByPk(id);
  }

  async update(id: number, publication: Partial<Publication>) {
    await this.publicationModel.update(publication, { where: { id } });
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
