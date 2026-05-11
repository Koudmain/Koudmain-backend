import { Module } from '@nestjs/common';
import { SkillService } from './services/skill.service';
import { SkillController } from './controllers/skill.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Skill } from './models/skill.model';
import { SkillCategory } from '../skill-category/models/skill-category.model';

@Module({
  providers: [SkillService],
  controllers: [SkillController],
  imports: [SequelizeModule.forFeature([Skill, SkillCategory])],
  exports: [SkillService],
})
export class SkillModule {}
