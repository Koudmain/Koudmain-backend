import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken, getModelToken } from '@nestjs/sequelize';
import { WorkersService } from '@/modules/workers/services/workers.service';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { WorkerJob } from '@/modules/workers/models/worker-job.model';
import { NotFoundException } from '@nestjs/common';
import { Review } from '@/modules/review/models/review.model';
import { Application } from '@/modules/application/models/application.model';
import { WorkerExperience } from '@/modules/workers/models/worker-experience.model';
import { WorkerFormation } from '@/modules/workers/models/worker-formation.model';
import { AddressService } from '@/modules/address/services/address.service';
import { WorkerFormationType } from '@/modules/workers/models/worker-formation.model';

describe('WorkersService', () => {
  let service: WorkersService;

  const mockWorkerProfileModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
  };

  const mockWorkerJobModel = {
    bulkCreate: jest.fn(),
    destroy: jest.fn(),
  };

  const mockExperienceModel = {
    bulkCreate: jest.fn(),
    destroy: jest.fn(),
  };

  const mockFormationModel = {
    bulkCreate: jest.fn(),
    destroy: jest.fn(),
  };

  const mockAddressService = {
    createAddress: jest.fn(),
    updateAddress: jest.fn(),
  };

  const transaction = { id: 'tx' };
  const mockSequelize = {
    transaction: jest.fn((callback: (t: typeof transaction) => Promise<unknown>) =>
      callback(transaction),
    ),
  };

  const mockReviewModel = {
    findAll: jest.fn(),
  };

  const mockApplicationModel = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkersService,
        {
          provide: getModelToken(WorkerProfile),
          useValue: mockWorkerProfileModel,
        },
        {
          provide: getModelToken(WorkerJob),
          useValue: mockWorkerJobModel,
        },
        {
          provide: getModelToken(Review),
          useValue: mockReviewModel,
        },
        {
          provide: getModelToken(Application),
          useValue: mockApplicationModel,
        },
        { provide: getModelToken(WorkerExperience), useValue: mockExperienceModel },
        { provide: getModelToken(WorkerFormation), useValue: mockFormationModel },
        { provide: AddressService, useValue: mockAddressService },
        { provide: getConnectionToken(), useValue: mockSequelize },
      ],
    }).compile();

    service = module.get<WorkersService>(WorkersService);

    jest.clearAllMocks();
  });

  it('doit être défini', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('doit créer et retourner un profil worker avec succès', async () => {
      const dto = {
        userId: 1,
        bio: 'Super worker',
        workRadius: 30,
        skillCategoryIds: [1, 2],
      };

      const createdProfile = { id: 10, userId: 1, bio: 'Super worker', workRadius: 30 };
      mockWorkerProfileModel.create.mockResolvedValue(createdProfile);
      mockWorkerJobModel.bulkCreate.mockResolvedValue([]);

      const result = await service.create(dto);

      expect(mockWorkerProfileModel.create).toHaveBeenCalledWith(
        { userId: 1, bio: 'Super worker', workRadius: 30, addressId: undefined },
        { transaction: undefined },
      );
      expect(mockWorkerJobModel.bulkCreate).toHaveBeenCalledWith(
        [
          { workerId: 10, skillCategoryId: 1 },
          { workerId: 10, skillCategoryId: 2 },
        ],
        { transaction: undefined },
      );
      expect(result).toEqual(createdProfile);
    });
  });

  describe('getWorkerIdByUserId', () => {
    const userId = 42;

    it('doit retourner uniquement l’ID du worker si le profil existe', async () => {
      const mockWorkerResult = { id: 10 };
      mockWorkerProfileModel.findOne.mockResolvedValue(mockWorkerResult);

      const result = await service.getWorkerIdByUserId(userId);

      expect(mockWorkerProfileModel.findOne).toHaveBeenCalledWith({
        where: { userId },
        attributes: ['id'],
      });
      expect(result).toBe(10);
    });

    it('doit lever une NotFoundException si le profil n’existe pas', async () => {
      mockWorkerProfileModel.findOne.mockResolvedValue(null);

      await expect(service.getWorkerIdByUserId(userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getWorkerByUserId', () => {
    const userId = 42;

    it('doit retourner le profil complet du worker si il existe', async () => {
      const mockFullWorker = {
        id: 10,
        userId: userId,
        max_distance_km: 20,
        skillsDescription: 'Barman',
      };
      mockWorkerProfileModel.findOne.mockResolvedValue(mockFullWorker);

      const result = await service.getWorkerByUserId(userId);

      expect(mockWorkerProfileModel.findOne).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(result).toEqual(mockFullWorker);
    });

    it('doit lever une NotFoundException si le profil complet n’existe pas', async () => {
      mockWorkerProfileModel.findOne.mockResolvedValue(null);

      await expect(service.getWorkerByUserId(userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPublicProfile', () => {
    const workerId = 10;
    const employerUserId = 99;
    const worker = {
      id: workerId,
      userId: 42,
      user: { id: 42, first_name: 'Michel', last_name: 'Polnareff' },
      bio: 'Passionné de restauration',
      address: { city: 'Lyon' },
      skillCategories: [
        { id: 1, name: 'Service' },
        { id: 2, name: 'Bar' },
      ],
      missionsCompleted: 67,
      responseRate: '96.00',
      avgResponseTimeMin: 8,
      verifications: [{ type: 'IDENTITY', status: 'VERIFIED' }],
      experiences: [],
      formations: [],
    };

    it('should throw NotFoundException when the profile does not exist', async () => {
      mockWorkerProfileModel.findByPk.mockResolvedValue(null);

      await expect(service.getPublicProfile(workerId, employerUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should hide documents when the worker has not applied to the employer', async () => {
      mockWorkerProfileModel.findByPk.mockResolvedValue(worker);
      mockReviewModel.findAll.mockResolvedValue([]);
      mockApplicationModel.findOne.mockResolvedValue(null);

      const result = await service.getPublicProfile(workerId, employerUserId);

      expect(result.hasApplied).toBe(false);
      expect(result.documents).toEqual({ cv: null, coverLetter: null });
      expect(result.skills).toEqual([
        { id: 1, name: 'Service' },
        { id: 2, name: 'Bar' },
      ]);
      expect(result.reliability).toEqual({
        missionsCompleted: 67,
        responseRate: 96,
        avgResponseTimeMin: 8,
      });
      expect(result.verifications).toEqual([
        { type: 'IDENTITY', status: 'VERIFIED' },
        { type: 'SOCIAL_SECURITY', status: 'PENDING' },
        { type: 'ADDRESS_PROOF', status: 'PENDING' },
      ]);
    });

    it('should expose the CV, cover letter and reviews signed by the company', async () => {
      mockWorkerProfileModel.findByPk.mockResolvedValue(worker);
      mockReviewModel.findAll.mockResolvedValue([
        {
          id: 1,
          rating: 5,
          comment: 'Ponctuel',
          createdAt: new Date('2026-09-11'),
          reviewerCompanyId: 3,
          reviewerCompany: { name: 'La table du Midi', logoUrl: 'logo' },
        },
      ]);
      mockApplicationModel.findOne.mockResolvedValue({
        cvDocument: { filePath: 'https://drive/CV_Michel.pdf', sizeBytes: 273408 },
        coverLetterDocument: null,
      });

      const result = await service.getPublicProfile(workerId, employerUserId);

      expect(result.hasApplied).toBe(true);
      expect(result.documents).toEqual({
        cv: { url: 'https://drive/CV_Michel.pdf', name: 'CV_Michel.pdf', sizeBytes: 273408 },
        coverLetter: null,
      });
      expect(result.reviews[0].author).toEqual({
        name: 'La table du Midi',
        pictureUrl: 'logo',
        profileId: null,
      });
      expect(result.rating.average).toBe(5);
    });
  });
  describe('getPublicProfile (own profile)', () => {
    it('should give the worker access to the profiles of companies that reviewed them', async () => {
      mockWorkerProfileModel.findByPk.mockResolvedValue({
        id: 10,
        userId: 42,
        skillCategories: [],
        verifications: [],
        responseRate: null,
      });
      mockReviewModel.findAll.mockResolvedValue([
        {
          id: 1,
          rating: 4,
          reviewerCompanyId: 3,
          reviewerCompany: { name: 'La table du Midi', logoUrl: null },
        },
      ]);
      mockApplicationModel.findOne.mockResolvedValue(null);

      const result = await service.getPublicProfile(10, 42);

      expect(result.reviews[0].author).toEqual({
        name: 'La table du Midi',
        pictureUrl: null,
        profileId: 3,
      });
    });
  });

  describe('updateOwnProfile', () => {
    const userId = 42;
    const buildWorker = (addressId: number | null) => ({
      id: 10,
      userId,
      bio: 'Ancienne bio',
      workRadius: 20,
      addressId,
      update: jest.fn(),
    });

    beforeEach(() => {
      jest.spyOn(service, 'getOwnProfile').mockResolvedValue({ id: 10 } as never);
    });

    it('should replace skills, experiences and formations in a single transaction', async () => {
      const worker = buildWorker(5);
      mockWorkerProfileModel.findOne.mockResolvedValue(worker);

      const result = await service.updateOwnProfile(userId, {
        skillCategoryIds: [1, 2, 2],
        experiences: [{ title: 'Serveur', durationMonths: 12 }],
        formations: [{ title: 'Permis B', type: WorkerFormationType.PERMIT }],
      });

      expect(worker.update).toHaveBeenCalledWith(
        { bio: undefined, workRadius: undefined, addressId: 5 },
        { transaction },
      );
      expect(mockWorkerJobModel.destroy).toHaveBeenCalledWith({
        where: { workerId: 10 },
        transaction,
      });
      expect(mockWorkerJobModel.bulkCreate).toHaveBeenCalledWith(
        [
          { workerId: 10, skillCategoryId: 1 },
          { workerId: 10, skillCategoryId: 2 },
        ],
        { transaction },
      );
      expect(mockExperienceModel.bulkCreate).toHaveBeenCalledWith(
        [{ title: 'Serveur', durationMonths: 12, workerId: 10 }],
        { transaction },
      );
      expect(mockFormationModel.bulkCreate).toHaveBeenCalledWith(
        [{ title: 'Permis B', type: WorkerFormationType.PERMIT, workerId: 10 }],
        { transaction },
      );
      expect(result).toEqual({ id: 10 });
    });

    it('should not touch lists missing from the request', async () => {
      const worker = buildWorker(5);
      mockWorkerProfileModel.findOne.mockResolvedValue(worker);

      await service.updateOwnProfile(userId, { bio: 'Nouvelle bio', workRadius: 30 });

      expect(worker.update).toHaveBeenCalledWith(
        { bio: 'Nouvelle bio', workRadius: 30, addressId: 5 },
        { transaction },
      );
      expect(mockWorkerJobModel.destroy).not.toHaveBeenCalled();
      expect(mockExperienceModel.destroy).not.toHaveBeenCalled();
      expect(mockFormationModel.destroy).not.toHaveBeenCalled();
    });

    it('should update the existing address or create a new one', async () => {
      const address = { streetName: 'Rue Neuve', zipCode: '69001', city: 'Lyon' };

      const withAddress = buildWorker(5);
      mockWorkerProfileModel.findOne.mockResolvedValue(withAddress);
      await service.updateOwnProfile(userId, { address });
      expect(mockAddressService.updateAddress).toHaveBeenCalledWith(5, address);

      const withoutAddress = buildWorker(null);
      mockWorkerProfileModel.findOne.mockResolvedValue(withoutAddress);
      mockAddressService.createAddress.mockResolvedValue({ id: 8 });
      await service.updateOwnProfile(userId, { address });
      expect(mockAddressService.createAddress).toHaveBeenCalledWith(address);
      expect(withoutAddress.update).toHaveBeenCalledWith(
        expect.objectContaining({ addressId: 8 }),
        { transaction },
      );
    });
  });

  describe('getOwnProfile', () => {
    it('should return the public profile with the work radius', async () => {
      mockWorkerProfileModel.findOne.mockResolvedValue({ id: 10, workRadius: 25 });
      jest.spyOn(service, 'getPublicProfile').mockResolvedValue({ id: 10 } as never);

      const result = await service.getOwnProfile(42);

      expect(service.getPublicProfile).toHaveBeenCalledWith(10, 42);
      expect(result).toEqual({ id: 10, workRadius: 25 });
    });
  });
});
