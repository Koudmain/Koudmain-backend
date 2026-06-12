import { Test, TestingModule } from '@nestjs/testing';
import { AddressService } from './address.service';
import { getConnectionToken, getModelToken } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Address } from '@/modules/address/address.model';
import { GetMapAddressesDto, CreateAddressDto } from '@/modules/address/address.dto';
import { GeocodingService } from '@/common/utils/geocoding/geocoding.service';

describe('AddressService', () => {
  let service: AddressService;

  const mockAddressModel = {
    create: jest.fn(),
  };

  const mockSequelize: Partial<Sequelize> & { query: jest.Mock } = {
    query: jest.fn(),
  };

  const mockGeocodingService = {
    getCoordsFromAddress: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AddressService,
        { provide: getModelToken(Address), useValue: mockAddressModel },
        { provide: getConnectionToken(), useValue: mockSequelize },
        { provide: GeocodingService, useValue: mockGeocodingService }, // Ajout du mock ici !
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
    it('should build full_address, fetch coordinates, and call model.create', async () => {
      const body = {
        street_number: '10',
        street_name: 'Rue de Test',
        zip_code: '75000',
        city: 'Paris',
        country: 'France',
      } as CreateAddressDto;

      const mockCoords = { latitude: 48.85, longitude: 2.35 };
      mockGeocodingService.getCoordsFromAddress.mockResolvedValue(mockCoords);

      const expectedFullAddress = '10 Rue de Test, 75000 Paris, France';

      const created = {
        id: 1,
        ...body,
        full_address: expectedFullAddress,
        latitude: mockCoords.latitude,
        longitude: mockCoords.longitude,
      };
      mockAddressModel.create.mockResolvedValue(created);

      const result = await service.createAddress(body);

      expect(mockGeocodingService.getCoordsFromAddress).toHaveBeenCalledWith(expectedFullAddress);

      expect(mockAddressModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...body,
          full_address: expectedFullAddress,
          latitude: mockCoords.latitude,
          longitude: mockCoords.longitude,
        }),
      );
      expect(result).toEqual(created);
    });
  });

  describe('getAddressesInZone', () => {
    it('should query sequelize with envelope and return rows', async () => {
      const dto = { minLat: '1', maxLat: '2', minLng: '3', maxLng: '4' } as GetMapAddressesDto;
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
