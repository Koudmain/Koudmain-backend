import { SkillCategory } from '../models/skill-category.model';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

@Injectable()
export class SkillCategoryService {
  constructor(@InjectModel(SkillCategory) private skillCategoryModel: typeof SkillCategory) {}

  async getAll() {
    return this.skillCategoryModel.findAll();
  }
}
