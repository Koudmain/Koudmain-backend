import { Test, TestingModule } from '@nestjs/testing';
import { SkillController } from './controllers/skill.controller';
import { SkillService } from './services/skill.service';
import { SkillModule } from './skill.module';
import { getConnectionToken, getModelToken } from '@nestjs/sequelize';
import { Skill } from './models/skill.model';
import { SkillCategory } from '../skill-category/models/skill-category.model';

describe('SkillModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [SkillModule],
    })
      .overrideProvider(getConnectionToken())
      .useValue({ query: jest.fn() })
      .overrideProvider(getModelToken(Skill))
      .useValue({ create: jest.fn(), findAll: jest.fn() })
      .overrideProvider(getModelToken(SkillCategory))
      .useValue({ create: jest.fn(), findAll: jest.fn() })
      .compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should have Skill components', () => {
    expect(module.get(SkillController)).toBeInstanceOf(SkillController);
    expect(module.get(SkillService)).toBeInstanceOf(SkillService);
  });
});
