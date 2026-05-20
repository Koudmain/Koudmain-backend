import { Module } from '@nestjs/common';
import { PublicationService } from './services/publication.service';
import { PublicationController } from './controllers/publication.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Publication } from './models/publication.model';
import { PublicationSkill } from './models/publication-skill.model';

@Module({
  providers: [PublicationService],
  controllers: [PublicationController],
  imports: [SequelizeModule.forFeature([Publication, PublicationSkill])],
  exports: [PublicationService],
})
export class PublicationModule {}
