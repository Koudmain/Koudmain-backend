import { Module } from '@nestjs/common';
import { SkillCategoryService } from './services/skill-category.service';
import { SkillCategoryController } from './controllers/skill-category.controller';
import { SkillCategory } from './models/skill-category.model';
import { SequelizeModule } from '@nestjs/sequelize';

@Module({
  providers: [SkillCategoryService],
  controllers: [SkillCategoryController],
  imports: [SequelizeModule.forFeature([SkillCategory])],
  exports: [SkillCategoryService],
})
export class SkillCategoryModule {}
