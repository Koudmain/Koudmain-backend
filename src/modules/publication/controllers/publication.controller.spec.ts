import { Test, TestingModule } from '@nestjs/testing';
import { PublicationController } from './publication.controller';
import { PublicationService } from '../services/publication.service';
import { PostPublicationDto } from '../models/publication.model';

const mockPublicationService = {
  create: jest.fn(),
}

describe('PublicationController', () => {
  let controller: PublicationController;
  let service: PublicationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicationController],
      providers: [
        {
          provide: PublicationService,
          useValue: mockPublicationService,
        }
      ],
    }).compile();

    controller = module.get<PublicationController>(PublicationController);
    service = module.get<PublicationService>(PublicationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  })

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
        description: 'Besoin d\'un serveur pour une missions.',
        hourly_rate: 35.0,
        starting_date: new Date(),
        ending_date: new Date(),
      };

      const expectedServiceResult = {
        id: 1,
        ...createDto,
        CreatedAt: new Date(),
      };

      mockPublicationService.create.mockResolvedValue(expectedServiceResult);

      // Act
      const result = await controller.create(createDto);

      // Assert
      expect(mockPublicationService.create).toHaveBeenCalledTimes(1);
      expect(mockPublicationService.create).toHaveBeenCalledWith(createDto);

      expect(result).toEqual(expectedServiceResult);
    })
  })
});
