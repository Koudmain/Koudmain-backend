import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { AddressService } from './services/address.service';
import { AddressController } from './controllers/address.controller';
import { Address } from './address.model';
import { GeocodingService } from '@/common/utils/geocoding/geocoding.service';

describe('AddressModule', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    const mockGeocodingService = {
      getCoordsFromAddress: jest.fn(),
    };

    const mockSequelize = {
      query: jest.fn(),
    };

    moduleRef = await Test.createTestingModule({
      controllers: [AddressController],
      providers: [
        AddressService,
        {
          provide: GeocodingService,
          useValue: mockGeocodingService,
        },
        {
          provide: getModelToken(Address),
          useValue: {},
        },
        {
          provide: Sequelize,
          useValue: mockSequelize,
        },
      ],
    }).compile();
  });

  it('le module doit être défini et charger correctement ses composants', () => {
    expect(moduleRef).toBeDefined();

    const service = moduleRef.get<AddressService>(AddressService);
    const controller = moduleRef.get<AddressController>(AddressController);

    expect(service).toBeInstanceOf(AddressService);
    expect(controller).toBeInstanceOf(AddressController);
  });
});
