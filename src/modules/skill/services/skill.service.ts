import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Skill } from '@/modules/skill/models/skill.model';
import { SkillCategory } from '@/modules/skill-category/models/skill-category.model';

@Injectable()
export class SkillService {
  constructor(@InjectModel(Skill) private skillModel: typeof Skill) {}

  async create(skill: Partial<Skill>) {
    return this.skillModel.create({ ...skill });
  }

  async getAll() {
    return this.skillModel.findAll({
      attributes: { exclude: ['category_id'] },
      include: [SkillCategory],
    });
  }

  async getById(id: number) {
    return this.skillModel.findByPk(id, {
      attributes: { exclude: ['category_id'] },
      include: [SkillCategory],
    });
  }

  async getByCategoryId(categoryId: number) {
    return this.skillModel.findAll({
      where: { category_id: categoryId },
      attributes: { exclude: ['category_id'] },
      include: [SkillCategory],
    });
  }
}
