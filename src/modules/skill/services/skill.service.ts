import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Skill } from '../models/skill.model';
import { SkillCategory } from '../models/skill-category.model';

@Injectable()
export class SkillService {
  constructor(@InjectModel(Skill) private skillModel: typeof Skill) {}

  async create(skill: Partial<Skill>) {
    const maxId = await this.skillModel.max('id');
    const nextId = skill.id ?? (typeof maxId === 'number' ? maxId : 0) + 1;

    return this.skillModel.create({
      ...skill,
      id: nextId,
    });
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
