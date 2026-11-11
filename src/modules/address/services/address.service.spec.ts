import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AddressService } from '@/modules/address/services/address.service';
import { getConnectionToken, getModelToken } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Address } from '@/modules/address/address.model';
import { GetMapAddressesDto, CreateAddressDto } from '@/modules/address/address.dto';
import { GeocodingService } from '@/common/utils/geocoding/geocoding.service';

describe('AddressService', () => {
  let service: AddressService;

  const mockAddressModel = {
    create: jest.fn(),
    findByPk: jest.fn(),
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
      const body: CreateAddressDto = {
        streetNumber: '10',
        streetName: 'Rue de Test',
        zipCode: '75000',
        city: 'Paris',
        country: 'France',
      };

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
          street_number: body.streetNumber,
          street_name: body.streetName,
          zip_code: body.zipCode,
          city: body.city,
          country: body.country,
          full_address: expectedFullAddress,
          latitude: mockCoords.latitude,
          longitude: mockCoords.longitude,
        }),
      );
      expect(result).toEqual(created);
    });
  });

  describe('updateAddress', () => {
    const body: CreateAddressDto = {
      streetNumber: '5',
      streetName: 'Rue Neuve',
      zipCode: '69001',
      city: 'Lyon',
    };

    it('should geocode the new address and update the existing record', async () => {
      const existing = { update: jest.fn().mockResolvedValue('updated') };
      mockAddressModel.findByPk.mockResolvedValue(existing);
      mockGeocodingService.getCoordsFromAddress.mockResolvedValue({
        latitude: 45.76,
        longitude: 4.83,
      });

      const result = await service.updateAddress(3, body);

      expect(mockAddressModel.findByPk).toHaveBeenCalledWith(3);
      expect(existing.update).toHaveBeenCalledWith(
        expect.objectContaining({
          city: 'Lyon',
          full_address: '5 Rue Neuve, 69001 Lyon, France',
          latitude: 45.76,
          longitude: 4.83,
        }),
      );
      expect(mockAddressModel.create).not.toHaveBeenCalled();
      expect(result).toBe('updated');
    });

    it('should throw NotFoundException when the address does not exist', async () => {
      mockAddressModel.findByPk.mockResolvedValue(null);

      await expect(service.updateAddress(99, body)).rejects.toThrow(NotFoundException);
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
