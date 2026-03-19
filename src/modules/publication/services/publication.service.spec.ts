import { Test } from '@nestjs/testing';
import { PublicationService } from './publication.service';
import { getConnectionToken, getModelToken } from '@nestjs/sequelize';
import { Publication } from '../models/publication.model';

describe('PublicationService', () => {
  let service: PublicationService;

  const mockPublicationModel = {
    create: jest.fn(),
    max: jest.fn(),
  }

  const mockSequelize = {
    query: jest.fn(),
  }

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
        }
      ],
    }).compile();

    service = moduleRef.get<PublicationService>(PublicationService);
  });

  it('should create a publication with auto-incremented id', async () => {
    // Arrange
    mockPublicationModel.max.mockResolvedValue(5);
    mockPublicationModel.create.mockImplementation((data) => Promise.resolve(data))

    const publicationData: Partial<Publication> = {
      title: 'Test Publication',
      description: 'Test Description',
    };

    // Act
    const result = await service.create(publicationData);

    // Assert
    expect(result.id).toEqual(6);
    expect(result.title).toEqual("Test Publication");
    expect(result.description).toEqual("Test Description");

    expect(mockPublicationModel.create).toHaveBeenCalledWith(expect.objectContaining({id : 6}));
  });

  it('should use provided dates when creating publication', async () => {
    // Arrange
    mockPublicationModel.create.mockImplementation((data) => Promise.resolve(data))

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
});
