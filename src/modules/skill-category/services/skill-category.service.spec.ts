import { Test, TestingModule } from '@nestjs/testing';
import { SkillCategoryService } from './skill-category.service';
import { SkillCategory } from '@/modules/skill-category/models/skill-category.model';
import { getModelToken, getConnectionToken } from '@nestjs/sequelize';

describe('SkillCategoryService', () => {
  let service: SkillCategoryService;

  const mockSequelize = {
    query: jest.fn(),
  };

  const mockSkillCategoryModel = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillCategoryService,
        {
          provide: getModelToken(SkillCategory),
          useValue: mockSkillCategoryModel,
        },
        {
          provide: getConnectionToken(),
          useValue: mockSequelize,
        },
      ],
    }).compile();

    service = module.get<SkillCategoryService>(SkillCategoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get all Skills', async () => {
    // Arrange
    const expectedResult = [{ id: 1, name: 'Test Category' }, { id: 2, name: 'Another Category' }];
    mockSkillCategoryModel.findAll.mockResolvedValue(expectedResult);

    // Act
    const result = await service.getAll();

    // Assert
    expect(mockSkillCategoryModel.findAll).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expectedResult);
  });
});
