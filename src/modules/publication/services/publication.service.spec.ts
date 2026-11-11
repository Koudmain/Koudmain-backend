import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/sequelize';
import { PublicationService } from './publication.service';
import { PostPublicationDto, Publication } from '@/modules/publication/models/publication.model';
import { CompanyMember } from '@/modules/companies/models/company-member.model';

const EMPLOYER_ID = 7;
const COMPANY_ID = 3;

describe('PublicationService', () => {
  let service: PublicationService;

  const mockPublicationModel = {
    create: jest.fn(),
    max: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
  };

  const mockCompanyMemberModel = {
    findOne: jest.fn(),
  };

  const basePublication: PostPublicationDto = {
    companyId: COMPANY_ID,
    title: 'Test Publication',
    hourly_rate: 20.0,
    starting_date: new Date().toISOString(),
    ending_date: new Date().toISOString(),
  };

  // Simulates Model.create followed by the getById reload.
  const mockCreate = ($set = jest.fn().mockResolvedValue(undefined)) =>
    mockPublicationModel.create.mockImplementation((data: Record<string, unknown>) => {
      const instance = { ...data, $set };
      mockPublicationModel.findByPk.mockResolvedValue(instance);
      return Promise.resolve(instance);
    });

  const existingPublication = () => ({
    id: 1,
    companyId: COMPANY_ID,
    update: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    $set: jest.fn().mockResolvedValue(undefined),
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PublicationService,
        { provide: getModelToken(Publication), useValue: mockPublicationModel },
        { provide: getModelToken(CompanyMember), useValue: mockCompanyMemberModel },
      ],
    }).compile();

    service = moduleRef.get<PublicationService>(PublicationService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockCompanyMemberModel.findOne.mockResolvedValue({ id: 1 });
  });

  describe('create', () => {
    it('should create a publication with auto-incremented id', async () => {
      mockPublicationModel.max.mockResolvedValue(5);
      mockCreate();

      const result = await service.create(EMPLOYER_ID, basePublication);

      expect(result.id).toEqual(6);
      expect(result.title).toEqual('Test Publication');
      expect(mockPublicationModel.create).toHaveBeenCalledWith(expect.objectContaining({ id: 6 }));
    });

    it('should open the publication and keep its options', async () => {
      mockCreate();

      await service.create(EMPLOYER_ID, { ...basePublication, autoAccept: true, highlight: true });

      expect(mockPublicationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'Ouverte', autoAccept: true, highlight: true }),
      );
    });

    it('should take the creator from the authenticated user', async () => {
      mockCreate();

      await service.create(EMPLOYER_ID, basePublication);

      expect(mockPublicationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ createdByUserId: EMPLOYER_ID, companyId: COMPANY_ID }),
      );
    });

    it('should refuse an employer who is not a member of the company', async () => {
      mockCompanyMemberModel.findOne.mockResolvedValue(null);

      await expect(service.create(99, basePublication)).rejects.toThrow(ForbiddenException);
      expect(mockCompanyMemberModel.findOne).toHaveBeenCalledWith({
        where: { userId: 99, companyId: COMPANY_ID },
      });
      expect(mockPublicationModel.create).not.toHaveBeenCalled();
    });

    it('should create a publication and set its skills', async () => {
      const $setSpy = jest.fn().mockResolvedValue(undefined);
      mockCreate($setSpy);

      const result = await service.create(EMPLOYER_ID, {
        ...basePublication,
        title: 'Skill Test',
        skills: [1, 2],
      });

      expect(result.title).toEqual('Skill Test');
      expect($setSpy).toHaveBeenCalledWith('skills', [1, 2]);
    });

    it('should use provided dates when creating publication', async () => {
      mockCreate();
      const customDate = new Date('2024-01-01').toISOString();

      const result = await service.create(EMPLOYER_ID, {
        ...basePublication,
        starting_date: customDate,
        ending_date: customDate,
      });

      expect(result.createdAt).toEqual(expect.any(Date));
      expect(result.starting_date).toEqual(customDate);
      expect(result.ending_date).toEqual(customDate);
    });
  });

  it('should get all publications', async () => {
    const expectedResult = [{ id: 1, title: 'Test Publication' }];
    mockPublicationModel.findAll.mockResolvedValue(expectedResult);

    const result = await service.getAll();

    expect(mockPublicationModel.findAll).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expectedResult);
  });

  it('should get a publication by its ID', async () => {
    const expectedResult = { id: 1, title: 'Test Publication' };
    mockPublicationModel.findByPk.mockResolvedValue(expectedResult);

    const result = await service.getById(1);

    expect(mockPublicationModel.findByPk).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expectedResult);
  });

  describe('update', () => {
    it('should update a publication of the employer company', async () => {
      const publication = existingPublication();
      mockPublicationModel.findByPk.mockResolvedValue(publication);

      const result = await service.update(EMPLOYER_ID, 1, { title: 'Updated Title' });

      expect(publication.update).toHaveBeenCalledWith({ title: 'Updated Title' });
      expect(publication.$set).not.toHaveBeenCalled();
      expect(result).toBe(publication);
    });

    it('should set its skills when provided', async () => {
      const publication = existingPublication();
      mockPublicationModel.findByPk.mockResolvedValue(publication);

      await service.update(EMPLOYER_ID, 1, { title: 'Updated Title', skills: [3, 4] });

      expect(publication.update).toHaveBeenCalledWith({ title: 'Updated Title' });
      expect(publication.$set).toHaveBeenCalledWith('skills', [3, 4]);
    });

    it('should refuse an employer of another company', async () => {
      const publication = existingPublication();
      mockPublicationModel.findByPk.mockResolvedValue(publication);
      mockCompanyMemberModel.findOne.mockResolvedValue(null);

      await expect(service.update(99, 1, { title: 'Hack' })).rejects.toThrow(ForbiddenException);
      expect(publication.update).not.toHaveBeenCalled();
    });

    it('should return 404 for an unknown publication', async () => {
      mockPublicationModel.findByPk.mockResolvedValue(null);

      await expect(service.update(EMPLOYER_ID, 404, { title: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete a publication of the employer company', async () => {
      const publication = existingPublication();
      mockPublicationModel.findByPk.mockResolvedValue(publication);

      const result = await service.delete(EMPLOYER_ID, 1);

      expect(publication.destroy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(1);
    });

    it('should refuse an employer of another company', async () => {
      const publication = existingPublication();
      mockPublicationModel.findByPk.mockResolvedValue(publication);
      mockCompanyMemberModel.findOne.mockResolvedValue(null);

      await expect(service.delete(99, 1)).rejects.toThrow(ForbiddenException);
      expect(publication.destroy).not.toHaveBeenCalled();
    });

    it('should return 404 for an unknown publication', async () => {
      mockPublicationModel.findByPk.mockResolvedValue(null);

      await expect(service.delete(EMPLOYER_ID, 404)).rejects.toThrow(NotFoundException);
    });
  });
});
