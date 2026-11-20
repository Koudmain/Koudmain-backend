import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { ApplicationService } from './application.service';
import { Application, ApplicationStatus } from '@/modules/application/models/application.model';
import { Publication } from '@/modules/publication/models/publication.model';
import { CompanyMember } from '@/modules/companies/models/company-member.model';

describe('ApplicationService', () => {
  let service: ApplicationService;
  let mockApplicationModel: { findAll: jest.Mock };
  let mockPublicationModel: { findByPk: jest.Mock };
  let mockCompanyMemberModel: { findOne: jest.Mock; findAll: jest.Mock };

  beforeEach(async () => {
    mockApplicationModel = { findAll: jest.fn().mockResolvedValue([]) };
    mockPublicationModel = { findByPk: jest.fn() };
    mockCompanyMemberModel = { findOne: jest.fn(), findAll: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ApplicationService,
        { provide: getModelToken(Application), useValue: mockApplicationModel },
        { provide: getModelToken(Publication), useValue: mockPublicationModel },
        { provide: getModelToken(CompanyMember), useValue: mockCompanyMemberModel },
      ],
    }).compile();

    service = moduleRef.get(ApplicationService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('assertMemberOfPublicationCompany', () => {
    it('throws NotFoundException when the publication does not exist', async () => {
      mockPublicationModel.findByPk.mockResolvedValue(null);

      await expect(service.assertMemberOfPublicationCompany(1, 10)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when the user is not a member of the owning company', async () => {
      mockPublicationModel.findByPk.mockResolvedValue({ id: 10, companyId: 5 });
      mockCompanyMemberModel.findOne.mockResolvedValue(null);

      await expect(service.assertMemberOfPublicationCompany(1, 10)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('returns the companyId when the user is a member', async () => {
      mockPublicationModel.findByPk.mockResolvedValue({ id: 10, companyId: 5 });
      mockCompanyMemberModel.findOne.mockResolvedValue({ id: 1, userId: 1, companyId: 5 });

      await expect(service.assertMemberOfPublicationCompany(1, 10)).resolves.toBe(5);
    });
  });

  describe('findForUser', () => {
    it('filters by the single authorized company when publicationId is given', async () => {
      mockPublicationModel.findByPk.mockResolvedValue({ id: 10, companyId: 5 });
      mockCompanyMemberModel.findOne.mockResolvedValue({ id: 1, userId: 1, companyId: 5 });

      await service.findForUser(1, { publicationId: 10, status: ApplicationStatus.PENDING });

      expect(mockApplicationModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: ApplicationStatus.PENDING },
          include: expect.arrayContaining([
            expect.objectContaining({ where: { companyId: [5], id: 10 } }),
          ]),
        }),
      );
    });

    it('rejects when publicationId is given but the user has no access', async () => {
      mockPublicationModel.findByPk.mockResolvedValue({ id: 10, companyId: 5 });
      mockCompanyMemberModel.findOne.mockResolvedValue(null);

      await expect(service.findForUser(1, { publicationId: 10 })).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockApplicationModel.findAll).not.toHaveBeenCalled();
    });

    it('falls back to every company the user belongs to when no publicationId is given', async () => {
      mockCompanyMemberModel.findAll.mockResolvedValue([{ companyId: 5 }, { companyId: 7 }]);

      await service.findForUser(1, {});

      expect(mockApplicationModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.arrayContaining([
            expect.objectContaining({ where: { companyId: [5, 7] } }),
          ]),
        }),
      );
    });
  });
});
