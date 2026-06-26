import { Column, Model, Table, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Company } from './company.model';
import { SkillCategory } from '@/modules/skill-category/models/skill-category.model';

@Table({ tableName: 'company_job', timestamps: false })
export class CompanyJob extends Model {
  @ForeignKey(() => Company)
  @Column({ field: 'company_id', type: DataType.INTEGER, primaryKey: true })
  declare companyId: number;

  @BelongsTo(() => Company)
  declare company: Company;

  @ForeignKey(() => SkillCategory)
  @Column({ field: 'skill_category_id', type: DataType.INTEGER, primaryKey: true })
  declare skillCategoryId: number;

  @BelongsTo(() => SkillCategory)
  declare skillCategory: SkillCategory;
}
