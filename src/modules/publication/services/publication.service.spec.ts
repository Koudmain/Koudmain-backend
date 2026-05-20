import { Test } from '@nestjs/testing';
import { PublicationService } from './publication.service';
import { getConnectionToken, getModelToken } from '@nestjs/sequelize';
import { Publication } from '../models/publication.model';

describe('PublicationService', () => {
  let service: PublicationService;

  const mockPublicationModel = {
    create: jest.fn(),
    max: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  };

  const mockSequelize = {
    query: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PublicationService,
        {
          provide: getModelToken(Publication),
          useValue: mockPublicationModel,
        },
        {
          provide: getConnectionToken(),
          useValue: mockSequelize,
        },
      ],
    }).compile();

    service = moduleRef.get<PublicationService>(PublicationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a publication with auto-incremented id', async () => {
    // Arrange
    mockPublicationModel.max.mockResolvedValue(5);
    mockPublicationModel.create.mockImplementation((data) => {
      const instance = { ...data, $set: jest.fn().mockResolvedValue(undefined) };
      mockPublicationModel.findByPk.mockResolvedValue(instance);
      return Promise.resolve(instance);
    });

    const publicationData: Partial<Publication> = {
      title: 'Test Publication',
      description: 'Test Description',
    };

    // Act
    const result = await service.create(publicationData);

    // Assert
    expect(result.id).toEqual(6);
    expect(result.title).toEqual('Test Publication');
    expect(result.description).toEqual('Test Description');

    expect(mockPublicationModel.create).toHaveBeenCalledWith(expect.objectContaining({ id: 6 }));
  });

  it('should create a publication and set its skills', async () => {
    // Arrange
    const $setSpy = jest.fn().mockResolvedValue(undefined);
    mockPublicationModel.create.mockImplementation((data) => {
      const instance = {
        ...data,
        $set: $setSpy,
      };
      mockPublicationModel.findByPk.mockResolvedValue(instance);
      return Promise.resolve(instance);
    });

    const publicationData = {
      title: 'Skill Test',
      skills: [1, 2],
    };

    // Act
    const result = await service.create(publicationData);

    // Assert
    expect(result.title).toEqual('Skill Test');
    expect($setSpy).toHaveBeenCalledWith('skills', [1, 2]);
  });

  it('should use provided dates when creating publication', async () => {
    // Arrange
    mockPublicationModel.create.mockImplementation((data) => {
      const instance = { ...data, $set: jest.fn().mockResolvedValue(undefined) };
      mockPublicationModel.findByPk.mockResolvedValue(instance);
      return Promise.resolve(instance);
    });

    const customDate = new Date('2024-01-01');
    const publicationData: Partial<Publication> = {
      title: 'Test Publication',
      createdAt: customDate,
      starting_date: customDate,
      ending_date: customDate,
    };

    // Act
    const result = await service.create(publicationData);

    // Assert
    expect(result.createdAt).toEqual(customDate);
    expect(result.starting_date).toEqual(customDate);
    expect(result.ending_date).toEqual(customDate);
  });

  it('should get all publications', async () => {
    // Arrange
    const expectedResult = [{ id: 1, title: 'Test Publication' }];
    mockPublicationModel.findAll.mockResolvedValue(expectedResult);

    // Act
    const result = await service.getAll();

    // Assert
    expect(mockPublicationModel.findAll).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expectedResult);
  });

  it('should get a publication by its ID', async () => {
    // Arrange
    const expectedResult = { id: 1, title: 'Test Publication' };
    mockPublicationModel.findByPk.mockResolvedValue(expectedResult);

    // Act
    const result = await service.getById(1);

    // Assert
    expect(mockPublicationModel.findByPk).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expectedResult);
  });

  it('should update a publication and return the updated publication', async () => {
    // Arrange
    const updatedData: Partial<Publication> = { title: 'Updated Title' };
    const expectedResult = { id: 1, title: 'Updated Title' };

    mockPublicationModel.update.mockResolvedValue([1]);
    mockPublicationModel.findByPk.mockResolvedValue(expectedResult);

    // Act
    const result = await service.update(1, updatedData);

    // Assert
    expect(mockPublicationModel.update).toHaveBeenCalledWith(updatedData, { where: { id: 1 } });
    expect(mockPublicationModel.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
    expect(result).toEqual(expectedResult);
  });

  it('should update a publication and set its skills when provided', async () => {
    // Arrange
    const $setSpy = jest.fn().mockResolvedValue(undefined);
    const mockInstance = {
      id: 1,
      title: 'Updated Title',
      $set: $setSpy,
    };
    mockPublicationModel.update.mockResolvedValue([1]);
    mockPublicationModel.findByPk.mockResolvedValue(mockInstance);

    const updatedData = {
      title: 'Updated Title',
      skills: [3, 4],
    };

    // Act
    const result = await service.update(1, updatedData);

    // Assert
    expect(mockPublicationModel.update).toHaveBeenCalledWith(
      { title: 'Updated Title' },
      { where: { id: 1 } },
    );
    expect($setSpy).toHaveBeenCalledWith('skills', [3, 4]);
    expect(result).toEqual(mockInstance);
  });

  it('should delete a publication by its ID', async () => {
    // Arrange
    const expectedResult = 1;
    mockPublicationModel.destroy.mockResolvedValue(1);

    // Act
    const result = await service.delete(1);

    // Assert
    expect(mockPublicationModel.destroy).toHaveBeenCalledTimes(1);
    expect(mockPublicationModel.destroy).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(result).toEqual(expectedResult);
  });
});
