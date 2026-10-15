import { Test, TestingModule } from '@nestjs/testing';
import { CompaniesController } from '@/modules/companies/controllers/companies.controller';
import { CompaniesService } from '@/modules/companies/services/companies.service';
import { UpdateCompanyAddressDto } from '@/modules/address/address.dto';
import { InternalServerErrorException, ForbiddenException } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';

interface RequestWithUser extends ExpressRequest {
  user: {
    sub: number;
    email: string;
  };
}

describe('CompaniesController', () => {
  let controller: CompaniesController;

  const mockCompaniesService = {
    getUserCompanies: jest.fn(),
    updateCompanyAddress: jest.fn(),
    updateCompany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompaniesController],
      providers: [
        {
          provide: CompaniesService,
          useValue: mockCompaniesService,
        },
      ],
    }).compile();

    controller = module.get<CompaniesController>(CompaniesController);
    jest.clearAllMocks();
  });

  it('doit être défini', () => {
    expect(controller).toBeDefined();
  });

  describe('getMyCompanies', () => {
    it('doit retourner une liste de sociétés pour l’utilisateur connecté', async () => {
      const userId = 1;
      const result = [{ id: 1, name: 'Test Company' }];
      const mockReq = { user: { sub: userId, email: 'test@example.com' } } as RequestWithUser;

      mockCompaniesService.getUserCompanies.mockResolvedValue(result);

      expect(await controller.getMyCompanies(mockReq)).toBe(result);
      expect(mockCompaniesService.getUserCompanies).toHaveBeenCalledWith(userId);
    });
  });

  describe('updateCompanyAddress', () => {
    const companyId = 10;
    const userId = 1;
    const mockReq = { user: { sub: userId, email: 'test@example.com' } } as RequestWithUser;
    const dto: UpdateCompanyAddressDto = {
      streetNumber: '15',
      streetName: 'Rue de la Paix',
      zipCode: '75002',
      city: 'Paris',
      country: 'France',
    };

    it('doit mettre à jour et retourner la société avec sa nouvelle adresse', async () => {
      const updatedCompany = { id: companyId, name: 'Test Company', address: dto };
      mockCompaniesService.updateCompanyAddress.mockResolvedValue(updatedCompany);

      const result = await controller.updateCompanyAddress(mockReq, companyId, dto);

      expect(result).toBe(updatedCompany);
      expect(mockCompaniesService.updateCompanyAddress).toHaveBeenCalledWith(
        userId,
        companyId,
        dto,
      );
    });

    it("doit propager ForbiddenException si l'utilisateur n'est pas Owner", async () => {
      mockCompaniesService.updateCompanyAddress.mockRejectedValue(
        new ForbiddenException("Vous n'avez pas les droits"),
      );

      await expect(controller.updateCompanyAddress(mockReq, companyId, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('doit propager InternalServerErrorException en cas d’échec du géocodage', async () => {
      mockCompaniesService.updateCompanyAddress.mockRejectedValue(
        new InternalServerErrorException('Erreur lors de la mise à jour'),
      );

      await expect(controller.updateCompanyAddress(mockReq, companyId, dto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
  describe('updateCompany', () => {
    it('should pass the user, company, fields and images to the service', async () => {
      const mockReq = { user: { sub: 1, email: 'owner@test.com' } } as RequestWithUser;
      const body = { name: 'Le Bistrot' };
      const files = { logo: [{ originalname: 'logo.jpg' } as Express.Multer.File] };
      mockCompaniesService.updateCompany.mockResolvedValue({ id: 10 });

      await expect(controller.updateCompany(mockReq, 10, body, files)).resolves.toEqual({
        id: 10,
      });
      expect(mockCompaniesService.updateCompany).toHaveBeenCalledWith(1, 10, body, files);
    });

    it('should propagate the ForbiddenException from the service', async () => {
      const mockReq = { user: { sub: 2, email: 'manager@test.com' } } as RequestWithUser;
      mockCompaniesService.updateCompany.mockRejectedValue(new ForbiddenException());

      await expect(controller.updateCompany(mockReq, 10, {})).rejects.toThrow(ForbiddenException);
    });
  });
});
