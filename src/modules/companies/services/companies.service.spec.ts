import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { CompaniesService } from './companies.service';
import { Company } from '@/modules/companies/models/company.model';
import { CompanyMember } from '@/modules/companies/models/company-member.model';
import { Address } from '@/modules/adress/adress.model';
import { GeocodingService } from '@/common/utils/geocoding.service';
import {
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('CompaniesService', () => {
  let service: CompaniesService;

  const mockCompanyModel = {
    create: jest.fn(),
    findByPk: jest.fn(),
  };

  const mockMemberModel = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  const mockAddressModel = {
    findOne: jest.fn(),
    create: jest.fn(),
  };

  const mockGeocodingService = {
    getCoordsFromAddress: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: getModelToken(Company), useValue: mockCompanyModel },
        { provide: getModelToken(CompanyMember), useValue: mockMemberModel },
        { provide: getModelToken(Address), useValue: mockAddressModel },
        { provide: GeocodingService, useValue: mockGeocodingService },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);

    jest.clearAllMocks();
  });

  describe('updateCompanyAddress', () => {
    const userId = 1;
    const companyId = 10;
    const dto = {
      street_number: '15',
      street_name: 'Rue de la Paix',
      zip_code: '75002',
      city: 'Paris',
      country: 'France',
    };

    it("doit lever ForbiddenException si l'utilisateur n'est pas Owner", async () => {
      mockMemberModel.findOne.mockResolvedValue(null);

      await expect(service.updateCompanyAddress(userId, companyId, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('doit lever NotFoundException si la société n’existe pas', async () => {
      mockMemberModel.findOne.mockResolvedValue({ role: 'Owner' });
      mockCompanyModel.findByPk.mockResolvedValue(null);

      await expect(service.updateCompanyAddress(userId, companyId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('doit réutiliser une adresse existante si elle est trouvée', async () => {
      mockMemberModel.findOne.mockResolvedValue({ role: 'Owner' });
      const mockCompany = { id: companyId, addressId: null, set: jest.fn(), save: jest.fn() };
      mockCompanyModel.findByPk.mockResolvedValueOnce(mockCompany);

      const existingAddress = { id: 50 };
      mockAddressModel.findOne.mockResolvedValue(existingAddress);

      mockCompanyModel.findByPk.mockResolvedValueOnce({ ...mockCompany, address: existingAddress });

      await service.updateCompanyAddress(userId, companyId, dto);

      expect(mockAddressModel.create).not.toHaveBeenCalled();
      expect(mockCompany.set).toHaveBeenCalledWith('addressId', 50);
      expect(mockCompany.save).toHaveBeenCalled();
    });

    it("doit créer une nouvelle adresse et la géocoder si elle n'existe pas", async () => {
      mockMemberModel.findOne.mockResolvedValue({ role: 'Owner' });
      const mockCompany = { id: companyId, addressId: null, set: jest.fn(), save: jest.fn() };
      mockCompanyModel.findByPk.mockResolvedValueOnce(mockCompany);

      mockAddressModel.findOne.mockResolvedValue(null);
      mockGeocodingService.getCoordsFromAddress.mockResolvedValue({
        latitude: 48.8,
        longitude: 2.3,
      });
      mockAddressModel.create.mockResolvedValue({ id: 99 });

      mockCompanyModel.findByPk.mockResolvedValueOnce({ ...mockCompany, addressId: 99 });

      await service.updateCompanyAddress(userId, companyId, dto);

      expect(mockGeocodingService.getCoordsFromAddress).toHaveBeenCalled();
      expect(mockAddressModel.create).toHaveBeenCalled();
      expect(mockCompany.set).toHaveBeenCalledWith('addressId', 99);
    });

    it('doit lever InternalServerErrorException en cas d’erreur', async () => {
      mockMemberModel.findOne.mockResolvedValue({ role: 'Owner' });
      mockCompanyModel.findByPk.mockRejectedValue(new Error('DB Error'));

      await expect(service.updateCompanyAddress(userId, companyId, dto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getUserCompanies', () => {
    it('doit retourner les sociétés mappées', async () => {
      const mockMemberships = [
        {
          role: 'Owner',
          company: { id: 1, name: 'Company 1' },
        },
      ];
      mockMemberModel.findAll.mockResolvedValue(mockMemberships);
      const result = await service.getUserCompanies(1);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ id: 1, name: 'Company 1', role: 'Owner' });
    });
  });
});
