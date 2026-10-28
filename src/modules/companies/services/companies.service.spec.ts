import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { CompaniesService } from '@/modules/companies/services/companies.service';
import { Company } from '@/modules/companies/models/company.model';
import { CompanyMember } from '@/modules/companies/models/company-member.model';
import { CompanyJob } from '@/modules/companies/models/company-job.model';
import { Address } from '@/modules/address/address.model';
import { GeocodingService } from '@/common/utils/geocoding/geocoding.service';
import {
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { OwnerPosition } from '@/modules/auth/models/register.model';
import { Publication } from '@/modules/publication/models/publication.model';
import { Application } from '@/modules/application/models/application.model';
import { Mission } from '@/modules/mission/models/mission.model';
import { Review } from '@/modules/review/models/review.model';
import { DriveService } from '@/modules/drive/drive.service';

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

  const mockCompanyJobModel = {
    bulkCreate: jest.fn(),
  };

  const mockPublicationModel = {
    count: jest.fn(),
    findAll: jest.fn(),
  };

  const mockApplicationModel = {
    findAll: jest.fn(),
  };

  const mockMissionModel = {
    findAll: jest.fn(),
  };

  const mockReviewModel = {
    findAll: jest.fn(),
  };

  const mockGeocodingService = {
    getCoordsFromAddress: jest.fn(),
  };

  const mockDriveService = {
    uploadImage: jest.fn(),
    deleteFile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: getModelToken(Company), useValue: mockCompanyModel },
        { provide: getModelToken(CompanyMember), useValue: mockMemberModel },
        { provide: getModelToken(CompanyJob), useValue: mockCompanyJobModel },
        { provide: getModelToken(Address), useValue: mockAddressModel },
        { provide: getModelToken(Publication), useValue: mockPublicationModel },
        { provide: getModelToken(Application), useValue: mockApplicationModel },
        { provide: getModelToken(Mission), useValue: mockMissionModel },
        { provide: getModelToken(Review), useValue: mockReviewModel },
        { provide: GeocodingService, useValue: mockGeocodingService },
        { provide: DriveService, useValue: mockDriveService },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);

    jest.clearAllMocks();
  });

  describe('updateCompanyAddress', () => {
    const userId = 1;
    const companyId = 10;
    const dto = {
      streetNumber: '15',
      streetName: 'Rue de la Paix',
      zipCode: '75002',
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
      mockMemberModel.findOne.mockResolvedValue({ role: OwnerPosition.OWNER });
      mockCompanyModel.findByPk.mockResolvedValue(null);

      await expect(service.updateCompanyAddress(userId, companyId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("doit mettre à jour l'adresse existante si l'entreprise en a déjà une", async () => {
      mockMemberModel.findOne.mockResolvedValue({ role: OwnerPosition.OWNER });

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
      mockMemberModel.findOne.mockResolvedValue({ role: OwnerPosition.OWNER });

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
      mockMemberModel.findOne.mockResolvedValue({ role: OwnerPosition.OWNER });

      mockCompanyModel.findByPk.mockRejectedValue(new InternalServerErrorException('DB Error'));

      await expect(service.updateCompanyAddress(userId, companyId, dto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('updateCompany', () => {
    const userId = 1;
    const companyId = 10;
    const image = { buffer: Buffer.from('img') } as Express.Multer.File;

    beforeEach(() => {
      jest.spyOn(service, 'getPublicProfile').mockResolvedValue({ id: companyId } as never);
    });

    it('should reject a member who is not the owner without uploading anything to Drive', async () => {
      mockMemberModel.findOne.mockResolvedValue({ role: OwnerPosition.MANAGER });

      await expect(
        service.updateCompany(userId, companyId, { name: 'X' }, { logo: [image] }),
      ).rejects.toThrow(ForbiddenException);
      expect(mockDriveService.uploadImage).not.toHaveBeenCalled();
    });

    it('should update the fields, replace the logo and upload the cover as a banner', async () => {
      mockMemberModel.findOne.mockResolvedValue({ role: OwnerPosition.OWNER });
      const company = { logoUrl: 'https://drive/old-logo', coverImageUrl: null, update: jest.fn() };
      mockCompanyModel.findByPk.mockResolvedValueOnce(company);
      mockDriveService.uploadImage
        .mockResolvedValueOnce('https://drive/new-logo')
        .mockResolvedValueOnce('https://drive/new-cover');

      const result = await service.updateCompany(
        userId,
        companyId,
        { name: 'Le Bistrot', capacity: 40, mealProvided: true },
        { logo: [image], cover: [image] },
      );

      expect(mockDriveService.deleteFile).toHaveBeenCalledWith('https://drive/old-logo');
      expect(mockDriveService.deleteFile).toHaveBeenCalledTimes(1);
      expect(mockDriveService.uploadImage).toHaveBeenNthCalledWith(1, image);
      expect(mockDriveService.uploadImage).toHaveBeenNthCalledWith(2, image, {
        width: 1200,
        height: 600,
      });
      expect(company.update).toHaveBeenCalledWith({
        name: 'Le Bistrot',
        capacity: 40,
        mealProvided: true,
        logoUrl: 'https://drive/new-logo',
        coverImageUrl: 'https://drive/new-cover',
      });
      expect(result).toEqual({ id: companyId });
    });

    it('should keep the old logo when the new upload fails', async () => {
      mockMemberModel.findOne.mockResolvedValue({ role: OwnerPosition.OWNER });
      const company = { logoUrl: 'https://drive/old-logo', coverImageUrl: null, update: jest.fn() };
      mockCompanyModel.findByPk.mockResolvedValueOnce(company);
      mockDriveService.uploadImage.mockRejectedValueOnce(new Error('Drive down'));

      await expect(service.updateCompany(userId, companyId, {}, { logo: [image] })).rejects.toThrow(
        'Drive down',
      );
      expect(mockDriveService.deleteFile).not.toHaveBeenCalled();
      expect(company.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the company does not exist', async () => {
      mockMemberModel.findOne.mockResolvedValue({ role: OwnerPosition.OWNER });
      mockCompanyModel.findByPk.mockResolvedValueOnce(null);

      await expect(service.updateCompany(userId, companyId, {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserCompanies', () => {
    it('doit retourner les sociétés mappées avec leur adresse', async () => {
      const mockAddress = { id: 50, full_address: '15 Rue de la Paix, 75002 Paris' };
      const mockMemberships = [
        {
          role: OwnerPosition.OWNER,
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
        role: OwnerPosition.OWNER,
        address: mockAddress,
      });
    });
  });

  describe('getPublicProfile', () => {
    const companyId = 10;
    const company = {
      id: companyId,
      name: 'Le Boston Café',
      companyType: 'Brasserie',
      description: 'Brasserie de quartier',
      logoUrl: null,
      coverImageUrl: null,
      specialties: 'Cuisine française',
      capacity: 60,
      teamSize: '8 personnes en brigade',
      mealProvided: true,
      dressCode: 'Chemise blanche',
      siretVerified: true,
      koudmainValidated: false,
      address: { city: 'Lyon' },
    };

    it('should throw NotFoundException when the company does not exist', async () => {
      mockCompanyModel.findByPk.mockResolvedValue(null);

      await expect(service.getPublicProfile(companyId, 1)).rejects.toThrow(NotFoundException);
    });

    it('should compute reliability metrics and the rating summary', async () => {
      mockCompanyModel.findByPk.mockResolvedValue(company);
      mockPublicationModel.count.mockResolvedValue(12);
      mockPublicationModel.findAll.mockResolvedValue([{ id: 1, title: 'Serveur H/F' }]);
      mockReviewModel.findAll.mockResolvedValue([
        {
          id: 1,
          rating: 5,
          comment: 'Top',
          createdAt: new Date('2026-09-11'),
          reviewer: { first_name: 'Michel', last_name: 'Polnareff', profile_picture_url: 'pic' },
          mission: { workerId: 7 },
        },
        { id: 2, rating: 4, comment: null, createdAt: new Date('2026-07-14'), reviewer: null },
      ]);
      mockMemberModel.findOne.mockResolvedValue(null);
      mockMissionModel.findAll.mockResolvedValue([
        { paidAt: new Date('2026-01-01'), paymentDueDate: new Date('2026-01-02') },
        { paidAt: new Date('2026-01-10'), paymentDueDate: new Date('2026-01-02') },
        { paidAt: new Date('2026-01-02'), paymentDueDate: new Date('2026-01-02') },
        { paidAt: new Date('2026-01-01'), paymentDueDate: new Date('2026-01-03') },
      ]);
      mockApplicationModel.findAll.mockResolvedValue([
        {
          createdAt: new Date('2026-01-01T10:00:00Z'),
          respondedAt: new Date('2026-01-01T10:30:00Z'),
        },
        {
          createdAt: new Date('2026-01-01T10:00:00Z'),
          respondedAt: new Date('2026-01-01T11:00:00Z'),
        },
      ]);

      const result = await service.getPublicProfile(companyId, 99);

      expect(result.reliability).toEqual({
        missionsPublished: 12,
        paidOnTimeRate: 75,
        avgResponseTimeMin: 45,
      });
      expect(result.rating).toEqual({
        average: 4.5,
        count: 2,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 },
      });
      expect(result.reviews[0].author).toEqual({
        name: 'Michel Polnareff',
        pictureUrl: 'pic',
        profileId: null,
      });
      expect(result.reviews[1].author).toEqual({
        name: 'Travailleur Koudmain',
        pictureUrl: null,
        profileId: null,
      });
      expect(result.openPublications).toEqual([{ id: 1, title: 'Serveur H/F' }]);
    });

    it('should return empty metrics when the company has no history', async () => {
      mockCompanyModel.findByPk.mockResolvedValue(company);
      mockPublicationModel.count.mockResolvedValue(0);
      mockPublicationModel.findAll.mockResolvedValue([]);
      mockReviewModel.findAll.mockResolvedValue([]);
      mockMissionModel.findAll.mockResolvedValue([]);
      mockApplicationModel.findAll.mockResolvedValue([]);
      mockMemberModel.findOne.mockResolvedValue(null);

      const result = await service.getPublicProfile(companyId, 99);

      expect(result.reliability).toEqual({
        missionsPublished: 0,
        paidOnTimeRate: null,
        avgResponseTimeMin: null,
      });
      expect(result.rating.count).toBe(0);
      expect(result.reviews).toEqual([]);
    });

    it('should give company members access to the profiles of workers who reviewed it', async () => {
      mockCompanyModel.findByPk.mockResolvedValue(company);
      mockPublicationModel.count.mockResolvedValue(0);
      mockPublicationModel.findAll.mockResolvedValue([]);
      mockReviewModel.findAll.mockResolvedValue([
        {
          id: 1,
          rating: 5,
          comment: null,
          createdAt: new Date(),
          reviewer: null,
          mission: { workerId: 7 },
        },
      ]);
      mockMissionModel.findAll.mockResolvedValue([]);
      mockApplicationModel.findAll.mockResolvedValue([]);
      mockMemberModel.findOne.mockResolvedValue({ id: 1 });

      const result = await service.getPublicProfile(companyId, 1);

      expect(mockMemberModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 1, companyId } }),
      );
      expect(result.reviews[0].author.profileId).toBe(7);
    });
  });
});
