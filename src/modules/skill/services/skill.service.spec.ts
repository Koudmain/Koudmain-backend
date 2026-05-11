import { Test } from '@nestjs/testing';
import { SkillService } from './skill.service';
import { getConnectionToken, getModelToken } from '@nestjs/sequelize';
import { Skill } from '../models/skill.model';

describe('SkillService', () => {
  let service: SkillService;

  const mockSkillModel = {
    create: jest.fn(),
    max: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
  };

  const mockSequelize = {
    query: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        SkillService,
        {
          provide: getModelToken(Skill),
          useValue: mockSkillModel,
        },
        {
          provide: getConnectionToken(),
          useValue: mockSequelize,
        },
      ],
    }).compile();

    service = moduleRef.get<SkillService>(SkillService);
  });

  it('should create a Skill with auto-incremented id', async () => {
    // Arrange
    mockSkillModel.max.mockResolvedValue(5);
    mockSkillModel.create.mockImplementation((data) => Promise.resolve(data));

    const SkillData: Partial<Skill> = {
      name: 'Test Skill',
    };

    // Act
    const result = await service.create(SkillData);

    // Assert
    expect(result.id).toEqual(6);
    expect(result.name).toEqual('Test Skill');

    expect(mockSkillModel.create).toHaveBeenCalledWith(expect.objectContaining({ id: 6 }));
  });

  it('should get all Skills', async () => {
    // Arrange
    const expectedResult = [{ id: 1, name: 'Test Skill', category_id: 1 }];
    mockSkillModel.findAll.mockResolvedValue(expectedResult);

    // Act
    const result = await service.getAll();

    // Assert
    expect(mockSkillModel.findAll).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expectedResult);
  });

  it('should get a Skill by its ID', async () => {
    // Arrange
    const expectedResult = { id: 1, name: 'Test Skill', category_id: 1 };
    mockSkillModel.findByPk.mockResolvedValue(expectedResult);

    // Act
    const result = await service.getById(1);

    // Assert
    expect(mockSkillModel.findByPk).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expectedResult);
  });

  it('should get Skills by category ID', async () => {
    // Arrange
    const expectedResult = [{ id: 1, name: 'Test Skill', category_id: 2 }];
    mockSkillModel.findAll.mockResolvedValue(expectedResult);

    // Act
    const result = await service.getByCategoryId(2);

    // Assert
    expect(mockSkillModel.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { category_id: 2 },
      }),
    );
    expect(result).toEqual(expectedResult);
  });
});
