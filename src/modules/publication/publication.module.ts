import { Module } from '@nestjs/common';
import { PublicationService } from './services/publication.service';
import { PublicationController } from './controllers/publication.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Publication } from './models/publication.model';
import { PublicationSkill } from './models/publication-skill.model';
import { Skill } from '@/modules/skill/models/skill.model';
import { CompanyMember } from '@/modules/companies/models/company-member.model';

@Module({
  providers: [PublicationService],
  controllers: [PublicationController],
  imports: [SequelizeModule.forFeature([Publication, PublicationSkill, Skill, CompanyMember])],
  exports: [PublicationService],
})
export class PublicationModule {}
