import { Test, TestingModule } from '@nestjs/testing';
import { SkillController } from './skill.controller';
import { SkillService } from '../services/skill.service';
import { PostSkillDto, PostSkillResponseDto } from '../models/skill.model';

const mockSkillService = {
  create: jest.fn(),
  getAll: jest.fn(),
  getById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('SkillController', () => {
  let controller: SkillController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SkillController],
      providers: [
        {
          provide: SkillService,
          useValue: mockSkillService,
        },
      ],
    }).compile();

    controller = module.get<SkillController>(SkillController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call SkillService.create and return the result', async () => {
      // Arrange
      const createDto: PostSkillDto = {
        name: 'Test Skill',
      };

      const expectedServiceResult: PostSkillResponseDto = {
        message: 'Skill créé avec succès',
        id: 1,
      };

      mockSkillService.create.mockResolvedValue(expectedServiceResult);

      // Act
      const result: PostSkillResponseDto = await controller.create(createDto);

      // Assert
      expect(mockSkillService.create).toHaveBeenCalledTimes(1);
      expect(mockSkillService.create).toHaveBeenCalledWith(createDto);

      expect(result).toEqual(expectedServiceResult);
      expect(result.message).toBe('Skill créé avec succès');
      expect(result.id).toBe(1);
    });
  });

  describe('getAll', () => {
    it('should call SkillService.getAll and return the result', async () => {
      // Arrange
      const expectedResult = [{ id: 1, name: 'Test Skill' }];
      mockSkillService.getAll.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.get();

      // Assert
      expect(mockSkillService.getAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getById', () => {
    it('should call SkillService.getById with correct id and return the result', async () => {
      // Arrange
      const expectedResult = { id: 1, name: 'Test Skill' };
      mockSkillService.getById.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.getById(1);

      // Assert
      expect(mockSkillService.getById).toHaveBeenCalledTimes(1);
      expect(mockSkillService.getById).toHaveBeenCalledWith(1);
      expect(result).toEqual(expectedResult);
    });
  });
});
