import { Test, TestingModule } from '@nestjs/testing';
import { SkillCategoryController } from './skill-category.controller';
import { SkillCategoryService } from '@/modules/skill-category/services/skill-category.service';

const mockSkillCategoryService = {
  getAll: jest.fn(),
};

describe('SkillCategoryController', () => {
  let controller: SkillCategoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SkillCategoryController],
      providers: [
        {
          provide: SkillCategoryService,
          useValue: mockSkillCategoryService,
        },
      ],
    }).compile();

    controller = module.get<SkillCategoryController>(SkillCategoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return an array of skill categories', async () => {
    // Arrange
    const result = [{ id: 1, name: 'Category 1' }, { id: 2, name: 'Category 2' }];
    mockSkillCategoryService.getAll.mockResolvedValue(result);

    // Act & Assert
    expect(await controller.getAll()).toBe(result);
  });
});
