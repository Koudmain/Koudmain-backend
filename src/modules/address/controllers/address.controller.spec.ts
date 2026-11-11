import { Test, TestingModule } from '@nestjs/testing';
import { AddressController } from './address.controller';
import { AddressService } from '@/modules/address/services/address.service';
import { GetMapAddressesDto } from '@/modules/address/address.dto';

describe('AddressController', () => {
  let controller: AddressController;

  const mockAddressService = {
    getPublicationsInZone: jest.fn(),
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

  describe('getMapAddresses', () => {
    it('doit appeler addressService.getPublicationsInZone avec les paramètres de query', async () => {
      const query: GetMapAddressesDto = { minLat: 1, maxLat: 2, minLng: 3, maxLng: 4 };
      const rows = [{ id: 1, latitude: 1.5, longitude: 3.5 }];
      mockAddressService.getPublicationsInZone.mockResolvedValue(rows);

      const result = await controller.getMapAddresses(query);

      expect(mockAddressService.getPublicationsInZone).toHaveBeenCalledWith(query);
      expect(result).toBe(rows);
    });
  });
});
