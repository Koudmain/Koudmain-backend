import { Test, TestingModule } from '@nestjs/testing';
import { SkillCategoryController } from './controllers/skill-category.controller';
import { SkillCategoryService } from './services/skill-category.service';
import { SkillCategoryModule } from './skill-category.module';
import { SkillCategory } from './models/skill-category.model';
import { getModelToken } from '@nestjs/sequelize';

describe('SkillCategoryModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [SkillCategoryModule],
    })
      .overrideProvider(getModelToken(SkillCategory))
      .useValue({})
      .compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should have Skill Category components', () => {
    expect(module.get(SkillCategoryController)).toBeInstanceOf(SkillCategoryController);
    expect(module.get(SkillCategoryService)).toBeInstanceOf(SkillCategoryService);
  });
});
