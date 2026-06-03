import { Test, TestingModule } from '@nestjs/testing';
import { AddressController } from './address.controller';
import { AddressService } from '@/modules/address/services/address.service';
import type { Request as ExpressRequest } from 'express';
import { CreateAddressDto, GetMapAddressesDto } from '@/modules/address/address.dto';

interface RequestWithUser extends ExpressRequest {
  user: {
    sub: number;
    email: string;
  };
}

describe('AddressController', () => {
  let controller: AddressController;

  const mockAddressService = {
    createAddress: jest.fn(),
    getAddressesInZone: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AddressController],
      providers: [
        {
          provide: AddressService,
          useValue: mockAddressService,
        },
      ],
    }).compile();

    controller = module.get<AddressController>(AddressController);
    jest.clearAllMocks();
  });

  it('doit être défini', () => {
    expect(controller).toBeDefined();
  });

  describe('createAddress', () => {
    it('doit appeler addressService.createAddress avec le DTO', async () => {
      const userId = 7;
      const dto: CreateAddressDto = {
        street_number: '1',
        street_name: 'Rue Test',
        zip_code: '75000',
        city: 'Paris',
        country: 'France',
        latitude: 48.85,
        longitude: 2.35,
      } as CreateAddressDto;

      const mockReq = { user: { sub: userId, email: 'a@b.c' } } as RequestWithUser;

      const created = { id: 123, ...dto };
      mockAddressService.createAddress.mockResolvedValue(created);

      const result = await controller.createAddress(mockReq, dto);

      expect(mockAddressService.createAddress).toHaveBeenCalledWith(dto);
      expect(result).toBe(created);
    });
  });

  describe('getMapAddresses', () => {
    it('doit appeler addressService.getAddressesInZone avec les paramètres de query', async () => {
      const query: GetMapAddressesDto = {
        min_lat: '1',
        max_lat: '2',
        min_lng: '3',
        max_lng: '4',
      } as GetMapAddressesDto;
      const rows = [{ id: 1, latitude: 1.5, longitude: 3.5 }];
      mockAddressService.getAddressesInZone.mockResolvedValue(rows);

      const result = await controller.getMapAddresses(query);

      expect(mockAddressService.getAddressesInZone).toHaveBeenCalledWith(query);
      expect(result).toBe(rows);
    });
  });
});
