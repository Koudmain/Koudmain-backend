import { Test, TestingModule } from '@nestjs/testing';
import { PublicationController } from './publication.controller';
import { PublicationService } from '../services/publication.service';
import { PostPublicationDto, PostPublicationResponseDto } from '../models/publication.model';

const mockPublicationService = {
  create: jest.fn(),
  getAll: jest.fn(),
  getById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('PublicationController', () => {
  let controller: PublicationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicationController],
      providers: [
        {
          provide: PublicationService,
          useValue: mockPublicationService,
        },
      ],
    }).compile();

    controller = module.get<PublicationController>(PublicationController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call PublicationService.create and return the result', async () => {
      // Arrange
      const createDto: PostPublicationDto = {
        company_id: 1,
        created_by_user_id: 69,
        address_id: 10,
        title: 'Server (H/F)',
        description: "Besoin d'un serveur pour une missions.",
        hourly_rate: 35.0,
        starting_date: new Date(),
        ending_date: new Date(),
      };

      const expectedServiceResult: PostPublicationResponseDto = {
        message: 'Publication créé avec succès',
        id: 1,
        createdAt: new Date(),
      };

      mockPublicationService.create.mockResolvedValue(expectedServiceResult);

      // Act
      const result: PostPublicationResponseDto = await controller.create(createDto);

      // Assert
      expect(mockPublicationService.create).toHaveBeenCalledTimes(1);
      expect(mockPublicationService.create).toHaveBeenCalledWith(createDto);

      expect(result).toEqual(expectedServiceResult);
      expect(result.message).toBe('Publication créé avec succès');
      expect(result.id).toBe(1);
      expect(result.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('getAll', () => {
    it('should call PublicationService.getAll and return the result', async () => {
      // Arrange
      const expectedResult = [{ id: 1, title: 'Test Publication' }];
      mockPublicationService.getAll.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.get();

      // Assert
      expect(mockPublicationService.getAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getById', () => {
    it('should call PublicationService.getById with correct id and return the result', async () => {
      // Arrange
      const expectedResult = { id: 1, title: 'Test Publication' };
      mockPublicationService.getById.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.getById(1);

      // Assert
      expect(mockPublicationService.getById).toHaveBeenCalledTimes(1);
      expect(mockPublicationService.getById).toHaveBeenCalledWith(1);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('update', () => {
    it('should call PublicationService.update with correct id and updateDto and return the result', async () => {
      // Arrange
      const updateDto = { title: 'Updated Title' };
      const expectedResult = { message: 'Publication éditée avec succès', id: 1 };
      mockPublicationService.update.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.update(1, updateDto);

      // Assert
      expect(mockPublicationService.update).toHaveBeenCalledTimes(1);
      expect(mockPublicationService.update).toHaveBeenCalledWith(1, updateDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('delete', () => {
    it('should call PublicationService.delete with correct id and return the result', async () => {
      // Arrange
      const expectedResult = { message: 'Publication supprimée avec succès' };
      mockPublicationService.delete.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.delete(1);

      // Assert
      expect(mockPublicationService.delete).toHaveBeenCalledTimes(1);
      expect(mockPublicationService.delete).toHaveBeenCalledWith(1);
      expect(result).toEqual(expectedResult);
    });
  });
});
