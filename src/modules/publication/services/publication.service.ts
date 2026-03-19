import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Publication } from '../models/publication.model';

@Injectable()
export class PublicationService {
    constructor(@InjectModel(Publication) private publicationModel: typeof Publication) {}

    async create(publication: Partial<Publication>) {
        const nextId =
            publication.id ??
            (((await this.publicationModel.max('id')) as number | null) ?? 0) + 1;

        return this.publicationModel.create({
            ...publication,
            id: nextId,
            create_at: publication.createdAt ?? new Date(),
            starting_date: publication.starting_date ?? new Date(),
            ending_date: publication.ending_date ?? new Date(),
        });
    }
}
