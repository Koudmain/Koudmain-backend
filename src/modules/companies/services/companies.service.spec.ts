import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { CompaniesService } from './companies.service';
import { Company } from '@/modules/companies/models/company.model';
import { CompanyMember } from '@/modules/companies/models/company-member.model';
import { Address } from '@/modules/address/address.model';
import { GeocodingService } from '@/common/utils/geocoding/geocoding.service';
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

    it("doit mettre à jour l'adresse existante si l'entreprise en a déjà une", async () => {
      mockMemberModel.findOne.mockResolvedValue({ role: 'Owner' });

      const mockAddressInstance = { id: 50, update: jest.fn() };
      const mockCompany = { id: companyId, address: mockAddressInstance };

      mockCompanyModel.findByPk.mockResolvedValueOnce(mockCompany);
      mockGeocodingService.getCoordsFromAddress.mockResolvedValue({
        latitude: 48.8,
        longitude: 2.3,
      });
      mockCompanyModel.findByPk.mockResolvedValueOnce(mockCompany);

      await service.updateCompanyAddress(userId, companyId, dto);

      expect(mockAddressInstance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          street_name: 'Rue de la Paix',
          full_address: '15 Rue de la Paix, 75002 Paris, France',
        }),
      );
      expect(mockAddressModel.create).not.toHaveBeenCalled();
    });

    it("doit créer une nouvelle adresse si l'entreprise n'en avait pas", async () => {
      mockMemberModel.findOne.mockResolvedValue({ role: 'Owner' });

      const mockCompany = { id: companyId, address: null, set: jest.fn(), save: jest.fn() };

      mockCompanyModel.findByPk.mockResolvedValueOnce(mockCompany);
      mockGeocodingService.getCoordsFromAddress.mockResolvedValue({
        latitude: 48.8,
        longitude: 2.3,
      });
      mockAddressModel.create.mockResolvedValue({ id: 99 });
      mockCompanyModel.findByPk.mockResolvedValueOnce({ ...mockCompany, address: { id: 99 } });

      await service.updateCompanyAddress(userId, companyId, dto);

      expect(mockGeocodingService.getCoordsFromAddress).toHaveBeenCalled();
      expect(mockAddressModel.create).toHaveBeenCalled();
      expect(mockCompany.set).toHaveBeenCalledWith('addressId', 99);
      expect(mockCompany.save).toHaveBeenCalled();
    });

    it('doit lever InternalServerErrorException en cas d’erreur', async () => {
      mockMemberModel.findOne.mockResolvedValue({ role: 'Owner' });

      mockCompanyModel.findByPk.mockRejectedValue(new InternalServerErrorException('DB Error'));

      await expect(service.updateCompanyAddress(userId, companyId, dto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getUserCompanies', () => {
    it('doit retourner les sociétés mappées avec leur adresse', async () => {
      const mockAddress = { id: 50, full_address: '15 Rue de la Paix, 75002 Paris' };
      const mockMemberships = [
        {
          role: 'Owner',
          company: {
            id: 1,
            name: 'Company 1',
            address: mockAddress,
          },
        },
      ];
      mockMemberModel.findAll.mockResolvedValue(mockMemberships);
      const result = await service.getUserCompanies(1);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        name: 'Company 1',
        role: 'Owner',
        address: mockAddress,
      });
    });
  });
});
