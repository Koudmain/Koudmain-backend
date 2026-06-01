import { Test, TestingModule } from '@nestjs/testing';
import { AddressService } from './address.service';
import { getConnectionToken, getModelToken } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Address } from '@/modules/address/address.model';
import { GetMapAddressesDto, CreateAddressDto } from '@/modules/address/address.dto';

describe('AddressService', () => {
  let service: AddressService;

  const mockAddressModel = {
    create: jest.fn(),
  };

  const mockSequelize: Partial<Sequelize> & { query: jest.Mock } = {
    query: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AddressService,
        { provide: getModelToken(Address), useValue: mockAddressModel },
        { provide: getConnectionToken(), useValue: mockSequelize },
      ],
    }).compile();

    service = moduleRef.get<AddressService>(AddressService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAddress', () => {
    it('should build complete_address and call model.create', async () => {
      const userId = 42;
      const body = {
        street_number: '10',
        street_name: 'Rue de Test',
        zip_code: '75000',
        city: 'Paris',
        country: 'France',
        latitude: 48.85,
        longitude: 2.35,
      } as CreateAddressDto;

      const created = {
        id: 1,
        ...body,
        user_id: userId,
        complete_address: '10 Rue de Test, 75000 Paris, France',
      };
      mockAddressModel.create.mockResolvedValue(created);

      const result = await service.createAddress(userId, body);

      expect(mockAddressModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...body,
          user_id: userId,
          complete_address: `${body.street_number} ${body.street_name}, ${body.zip_code} ${body.city}, ${body.country}`,
        }),
      );
      expect(result).toEqual(created);
    });
  });

  describe('getAddressesInZone', () => {
    it('should query sequelize with envelope and return rows', async () => {
      const dto = { min_lat: '1', max_lat: '2', min_lng: '3', max_lng: '4' } as GetMapAddressesDto;
      const rows = [{ id: 1, latitude: 1.5, longitude: 3.5 }];
      mockSequelize.query.mockResolvedValue(rows);

      const result = await service.getAddressesInZone(dto);

      expect(mockSequelize.query).toHaveBeenCalled();
      expect(result).toBe(rows);
      const callArgs = mockSequelize.query.mock.calls[0] as [
        string,
        { replacements: GetMapAddressesDto; type: string },
      ];

      expect(callArgs[0]).toContain('ST_MakeEnvelope');
      expect(callArgs[1]).toMatchObject({ replacements: dto, type: 'SELECT' });
    });
  });
});
