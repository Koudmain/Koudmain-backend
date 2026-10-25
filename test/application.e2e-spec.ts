import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/sequelize';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { ApplicationController } from '@/modules/application/controllers/application.controller';
import { ApplicationErrorCode } from '@/modules/application/enums/application-error-code.enum';
import { Application, ApplicationStatus } from '@/modules/application/models/application.model';
import { ApplicationService } from '@/modules/application/services/application.service';
import { AuthGuard } from '@/modules/auth/auth.guard';
import { ChatService } from '@/modules/chat/services/chat.service';
import { CompanyMember } from '@/modules/companies/models/company-member.model';
import { Publication } from '@/modules/publication/models/publication.model';
import { WorkerDocument, WorkerDocumentType } from '@/modules/workers/models/worker-document.model';
import { WorkersService } from '@/modules/workers/services/workers.service';

describe('ApplicationController (Functional / e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let workerToken: string;
  let employerToken: string;
  let otherWorkerToken: string;

  const workerUserId = 10;
  const otherWorkerUserId = 11;
  const employerUserId = 20;

  const mockApplicationModel = {
    findOne: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  };

  const mockPublicationModel = {
    findByPk: jest.fn(),
  };

  const mockWorkerDocumentModel = {
    findAll: jest.fn(),
  };

  const mockCompanyMemberModel = {
    findOne: jest.fn(),
  };

  const mockWorkersService = {
    getWorkerByUserId: jest.fn(),
  };

  const mockChatService = {
    findOrCreateConversation: jest.fn(),
    sendMessage: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-jwt-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [ApplicationController],
      providers: [
        ApplicationService,
        {
          provide: APP_GUARD,
          useClass: AuthGuard,
        },
        {
          provide: getModelToken(Application),
          useValue: mockApplicationModel,
        },
        {
          provide: getModelToken(Publication),
          useValue: mockPublicationModel,
        },
        {
          provide: getModelToken(WorkerDocument),
          useValue: mockWorkerDocumentModel,
        },
        {
          provide: getModelToken(CompanyMember),
          useValue: mockCompanyMemberModel,
        },
        {
          provide: WorkersService,
          useValue: mockWorkersService,
        },
        {
          provide: ChatService,
          useValue: mockChatService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    workerToken = jwtService.sign({ sub: workerUserId, email: 'worker1@koudmain.fr' });
    otherWorkerToken = jwtService.sign({ sub: otherWorkerUserId, email: 'worker2@koudmain.fr' });
    employerToken = jwtService.sign({ sub: employerUserId, email: 'employer1@koudmain.fr' });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // 1. GET /application/check/:publicationId
  // =========================================================================
  describe('GET /application/check/:publicationId', () => {
    const publicationId = 5;
    const workerProfile = { id: 100, userId: workerUserId };
    const activePublication = {
      id: publicationId,
      companyId: 50,
      ending_date: new Date(Date.now() + 86400000),
    };

    it('should return 401 when no token is provided', async () => {
      const res = await request(app.getHttpServer()).get(`/application/check/${publicationId}`);
      expect(res.status).toBe(401);
    });

    it('should return 401 when an invalid token is provided', async () => {
      const res = await request(app.getHttpServer())
        .get(`/application/check/${publicationId}`)
        .set('Authorization', 'Bearer invalid.jwt.token');
      expect(res.status).toBe(401);
    });

    it('should return 400 when publicationId is not a valid integer', async () => {
      const res = await request(app.getHttpServer())
        .get('/application/check/not-an-int')
        .set('Authorization', `Bearer ${workerToken}`);
      expect(res.status).toBe(400);
    });

    it('should return 404 (WORKER_PROFILE_NOT_FOUND) when worker profile does not exist', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get(`/application/check/${publicationId}`)
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        code: ApplicationErrorCode.WORKER_PROFILE_NOT_FOUND,
      });
    });

    it('should return 404 (PUBLICATION_NOT_FOUND) when publication does not exist', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(workerProfile);
      mockPublicationModel.findByPk.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get(`/application/check/${publicationId}`)
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        code: ApplicationErrorCode.PUBLICATION_NOT_FOUND,
      });
    });

    it('should return 200 with canApply: false and reason: OFFER_EXPIRED when offer is expired', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(workerProfile);
      mockPublicationModel.findByPk.mockResolvedValue({
        id: publicationId,
        ending_date: new Date(Date.now() - 86400000),
      });

      const res = await request(app.getHttpServer())
        .get(`/application/check/${publicationId}`)
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        canApply: false,
        reason: ApplicationErrorCode.OFFER_EXPIRED,
        message: 'Cette offre a déjà expiré',
      });
    });

    it('should return 200 with canApply: false and reason: ALREADY_APPLIED when worker already applied', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(workerProfile);
      mockPublicationModel.findByPk.mockResolvedValue(activePublication);
      mockApplicationModel.findOne.mockResolvedValue({ id: 999 });

      const res = await request(app.getHttpServer())
        .get(`/application/check/${publicationId}`)
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        canApply: false,
        reason: ApplicationErrorCode.ALREADY_APPLIED,
        message: 'Vous avez déjà postulé à cette offre',
      });
    });

    it('should return 200 with canApply: false, KYC_REQUIRED and completionPercentage: 0 when no KYC doc is verified', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(workerProfile);
      mockPublicationModel.findByPk.mockResolvedValue(activePublication);
      mockApplicationModel.findOne.mockResolvedValue(null);
      mockWorkerDocumentModel.findAll.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get(`/application/check/${publicationId}`)
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        canApply: false,
        reason: ApplicationErrorCode.KYC_REQUIRED,
        message: 'Documents KYC manquants ou non validés : IDENTITY, NIR, PROOF_OF_ADDRESS.',
        missingDocuments: [
          WorkerDocumentType.IDENTITY,
          WorkerDocumentType.NIR,
          WorkerDocumentType.PROOF_OF_ADDRESS,
        ],
        completionPercentage: 0,
      });
    });

    it('should return 200 with canApply: false, KYC_REQUIRED and completionPercentage: 33 when 1 of 3 KYC docs is verified', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(workerProfile);
      mockPublicationModel.findByPk.mockResolvedValue(activePublication);
      mockApplicationModel.findOne.mockResolvedValue(null);
      mockWorkerDocumentModel.findAll.mockResolvedValue([{ type: WorkerDocumentType.IDENTITY }]);

      const res = await request(app.getHttpServer())
        .get(`/application/check/${publicationId}`)
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        canApply: false,
        reason: ApplicationErrorCode.KYC_REQUIRED,
        message: 'Documents KYC manquants ou non validés : NIR, PROOF_OF_ADDRESS.',
        missingDocuments: [WorkerDocumentType.NIR, WorkerDocumentType.PROOF_OF_ADDRESS],
        completionPercentage: 33,
      });
    });

    it('should return 200 with canApply: false, KYC_REQUIRED and completionPercentage: 67 when 2 of 3 KYC docs are verified', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(workerProfile);
      mockPublicationModel.findByPk.mockResolvedValue(activePublication);
      mockApplicationModel.findOne.mockResolvedValue(null);
      mockWorkerDocumentModel.findAll.mockResolvedValue([
        { type: WorkerDocumentType.IDENTITY },
        { type: WorkerDocumentType.NIR },
      ]);

      const res = await request(app.getHttpServer())
        .get(`/application/check/${publicationId}`)
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        canApply: false,
        reason: ApplicationErrorCode.KYC_REQUIRED,
        message: 'Documents KYC manquants ou non validés : PROOF_OF_ADDRESS.',
        missingDocuments: [WorkerDocumentType.PROOF_OF_ADDRESS],
        completionPercentage: 67,
      });
    });

    it('should return 200 with canApply: true and completionPercentage: 100 when all conditions are met', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(workerProfile);
      mockPublicationModel.findByPk.mockResolvedValue(activePublication);
      mockApplicationModel.findOne.mockResolvedValue(null);
      mockWorkerDocumentModel.findAll.mockResolvedValue([
        { type: WorkerDocumentType.IDENTITY },
        { type: WorkerDocumentType.NIR },
        { type: WorkerDocumentType.PROOF_OF_ADDRESS },
      ]);

      const res = await request(app.getHttpServer())
        .get(`/application/check/${publicationId}`)
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        canApply: true,
        completionPercentage: 100,
      });
    });
  });

  // =========================================================================
  // 2. POST /application/apply
  // =========================================================================
  describe('POST /application/apply', () => {
    const publicationId = 5;
    const workerProfile = { id: 100, userId: workerUserId };
    const activePublication = {
      id: publicationId,
      companyId: 50,
      ending_date: new Date(Date.now() + 86400000),
    };
    const fullKycDocs = [
      { type: WorkerDocumentType.IDENTITY },
      { type: WorkerDocumentType.NIR },
      { type: WorkerDocumentType.PROOF_OF_ADDRESS },
    ];

    it('should return 401 when no token is provided', async () => {
      const res = await request(app.getHttpServer())
        .post('/application/apply')
        .send({ publicationId });
      expect(res.status).toBe(401);
    });

    it('should return 400 when publicationId is missing or not an integer', async () => {
      const res = await request(app.getHttpServer())
        .post('/application/apply')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ publicationId: 'invalid' });
      expect(res.status).toBe(400);
    });

    it('should return 400 when message exceeds 150 characters', async () => {
      const longMessage = 'a'.repeat(151);

      const res = await request(app.getHttpServer())
        .post('/application/apply')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ publicationId, message: longMessage });

      expect(res.status).toBe(400);
    });

    it('should return 400 when non-whitelisted fields are sent in body', async () => {
      const res = await request(app.getHttpServer())
        .post('/application/apply')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ publicationId, unexpectedField: 'hack' });

      expect(res.status).toBe(400);
    });

    it('should return 404 (WORKER_PROFILE_NOT_FOUND) when worker profile does not exist', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/application/apply')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ publicationId });

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        code: ApplicationErrorCode.WORKER_PROFILE_NOT_FOUND,
      });
    });

    it('should return 403 (KYC_REQUIRED) with missingDocuments and completionPercentage when KYC is incomplete', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(workerProfile);
      mockWorkerDocumentModel.findAll.mockResolvedValue([{ type: WorkerDocumentType.IDENTITY }]);

      const res = await request(app.getHttpServer())
        .post('/application/apply')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ publicationId, message: 'Bonjour !' });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        code: ApplicationErrorCode.KYC_REQUIRED,
        message: 'Documents KYC manquants ou non validés : NIR, PROOF_OF_ADDRESS.',
        missingDocuments: [WorkerDocumentType.NIR, WorkerDocumentType.PROOF_OF_ADDRESS],
        completionPercentage: 33,
      });
      expect(mockChatService.sendMessage).not.toHaveBeenCalled();
      expect(mockApplicationModel.create).not.toHaveBeenCalled();
    });

    it('should return 404 (PUBLICATION_NOT_FOUND) when publication does not exist', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(workerProfile);
      mockWorkerDocumentModel.findAll.mockResolvedValue(fullKycDocs);
      mockPublicationModel.findByPk.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/application/apply')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ publicationId });

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        code: ApplicationErrorCode.PUBLICATION_NOT_FOUND,
      });
    });

    it('should return 400 (OFFER_EXPIRED) when publication has expired', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(workerProfile);
      mockWorkerDocumentModel.findAll.mockResolvedValue(fullKycDocs);
      mockPublicationModel.findByPk.mockResolvedValue({
        id: publicationId,
        ending_date: new Date(Date.now() - 86400000),
      });

      const res = await request(app.getHttpServer())
        .post('/application/apply')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ publicationId });

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        code: ApplicationErrorCode.OFFER_EXPIRED,
      });
    });

    it('should return 409 (ALREADY_APPLIED) when worker has already applied', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(workerProfile);
      mockWorkerDocumentModel.findAll.mockResolvedValue(fullKycDocs);
      mockPublicationModel.findByPk.mockResolvedValue(activePublication);
      mockApplicationModel.findOne.mockResolvedValue({ id: 77 });

      const res = await request(app.getHttpServer())
        .post('/application/apply')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ publicationId });

      expect(res.status).toBe(409);
      expect(res.body).toMatchObject({
        code: ApplicationErrorCode.ALREADY_APPLIED,
      });
    });

    it('should return 201 and create application without message', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(workerProfile);
      mockWorkerDocumentModel.findAll.mockResolvedValue(fullKycDocs);
      mockPublicationModel.findByPk.mockResolvedValue(activePublication);
      mockApplicationModel.findOne.mockResolvedValue(null);
      mockApplicationModel.create.mockResolvedValue({
        id: 1,
        publicationId,
        workerId: workerProfile.id,
        status: ApplicationStatus.PENDING,
      });

      const res = await request(app.getHttpServer())
        .post('/application/apply')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ publicationId });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: 1,
        publicationId,
        workerId: workerProfile.id,
        status: ApplicationStatus.PENDING,
      });
      expect(mockChatService.findOrCreateConversation).not.toHaveBeenCalled();
      expect(mockChatService.sendMessage).not.toHaveBeenCalled();
    });

    it('should return 201, send chat message first, and create application when message is provided', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(workerProfile);
      mockWorkerDocumentModel.findAll.mockResolvedValue(fullKycDocs);
      mockPublicationModel.findByPk.mockResolvedValue(activePublication);
      mockApplicationModel.findOne.mockResolvedValue(null);
      mockChatService.findOrCreateConversation.mockResolvedValue({ id: 300 });
      mockChatService.sendMessage.mockResolvedValue({ id: 400 });
      mockApplicationModel.create.mockResolvedValue({
        id: 2,
        publicationId,
        workerId: workerProfile.id,
        status: ApplicationStatus.PENDING,
      });

      const res = await request(app.getHttpServer())
        .post('/application/apply')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ publicationId, message: '  Disponible immédiatement !  ' });

      expect(res.status).toBe(201);
      expect(mockChatService.findOrCreateConversation).toHaveBeenCalledWith(
        publicationId,
        workerProfile.id,
        activePublication.companyId,
      );
      expect(mockChatService.sendMessage).toHaveBeenCalledWith(
        workerUserId,
        300,
        'Disponible immédiatement !',
      );
      expect(mockApplicationModel.create).toHaveBeenCalled();
    });

    it('should return 201 and skip chat message if message contains only whitespace', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(workerProfile);
      mockWorkerDocumentModel.findAll.mockResolvedValue(fullKycDocs);
      mockPublicationModel.findByPk.mockResolvedValue(activePublication);
      mockApplicationModel.findOne.mockResolvedValue(null);
      mockApplicationModel.create.mockResolvedValue({
        id: 3,
        publicationId,
        workerId: workerProfile.id,
        status: ApplicationStatus.PENDING,
      });

      const res = await request(app.getHttpServer())
        .post('/application/apply')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ publicationId, message: '     ' });

      expect(res.status).toBe(201);
      expect(mockChatService.findOrCreateConversation).not.toHaveBeenCalled();
      expect(mockChatService.sendMessage).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 3. GET /application/me
  // =========================================================================
  describe('GET /application/me', () => {
    const workerProfile = { id: 100, userId: workerUserId };

    it('should return 401 when no token is provided', async () => {
      const res = await request(app.getHttpServer()).get('/application/me');
      expect(res.status).toBe(401);
    });

    it('should return 404 (WORKER_PROFILE_NOT_FOUND) when worker profile does not exist', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get('/application/me')
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        code: ApplicationErrorCode.WORKER_PROFILE_NOT_FOUND,
      });
    });

    it('should return 200 with list of worker applications', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(workerProfile);
      mockApplicationModel.findAll.mockResolvedValue([
        {
          id: 1,
          publicationId: 5,
          workerId: workerProfile.id,
          status: ApplicationStatus.PENDING,
        },
        {
          id: 2,
          publicationId: 6,
          workerId: workerProfile.id,
          status: ApplicationStatus.ACCEPTED,
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/application/me')
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toMatchObject({ id: 1, status: ApplicationStatus.PENDING });
      expect(res.body[1]).toMatchObject({ id: 2, status: ApplicationStatus.ACCEPTED });
    });
  });

  // =========================================================================
  // 4. GET /application/publication/:publicationId
  // =========================================================================
  describe('GET /application/publication/:publicationId', () => {
    const publicationId = 5;
    const publication = {
      id: publicationId,
      companyId: 50,
      createdByUserId: 999,
    };

    it('should return 401 when no token is provided', async () => {
      const res = await request(app.getHttpServer()).get(
        `/application/publication/${publicationId}`,
      );
      expect(res.status).toBe(401);
    });

    it('should return 400 when publicationId is not an integer', async () => {
      const res = await request(app.getHttpServer())
        .get('/application/publication/abc')
        .set('Authorization', `Bearer ${employerToken}`);
      expect(res.status).toBe(400);
    });

    it('should return 404 (PUBLICATION_NOT_FOUND) when publication does not exist', async () => {
      mockPublicationModel.findByPk.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get(`/application/publication/${publicationId}`)
        .set('Authorization', `Bearer ${employerToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        code: ApplicationErrorCode.PUBLICATION_NOT_FOUND,
      });
    });

    it('should return 403 (NOT_AUTHORIZED) when user is neither company member nor creator', async () => {
      mockPublicationModel.findByPk.mockResolvedValue(publication);
      mockCompanyMemberModel.findOne.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get(`/application/publication/${publicationId}`)
        .set('Authorization', `Bearer ${employerToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({
        code: ApplicationErrorCode.NOT_AUTHORIZED,
      });
    });

    it('should return 200 with applications when user is a member of the company', async () => {
      mockPublicationModel.findByPk.mockResolvedValue(publication);
      mockCompanyMemberModel.findOne.mockResolvedValue({
        id: 1,
        companyId: 50,
        userId: employerUserId,
      });
      mockApplicationModel.findAll.mockResolvedValue([
        { id: 10, publicationId, workerId: 100, status: ApplicationStatus.PENDING },
      ]);

      const res = await request(app.getHttpServer())
        .get(`/application/publication/${publicationId}`)
        .set('Authorization', `Bearer ${employerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ id: 10, publicationId });
    });

    it('should return 200 with applications when user is the creator of the publication', async () => {
      mockPublicationModel.findByPk.mockResolvedValue({
        ...publication,
        createdByUserId: employerUserId,
      });
      mockCompanyMemberModel.findOne.mockResolvedValue(null);
      mockApplicationModel.findAll.mockResolvedValue([
        { id: 11, publicationId, workerId: 101, status: ApplicationStatus.PENDING },
      ]);

      const res = await request(app.getHttpServer())
        .get(`/application/publication/${publicationId}`)
        .set('Authorization', `Bearer ${employerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ id: 11, publicationId });
    });
  });

  // =========================================================================
  // 5. PATCH /application/:id/status
  // =========================================================================
  describe('PATCH /application/:id/status', () => {
    const applicationId = 15;

    it('should return 401 when no token is provided', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/application/${applicationId}/status`)
        .send({ status: ApplicationStatus.ACCEPTED });
      expect(res.status).toBe(401);
    });

    it('should return 400 when id is not an integer', async () => {
      const res = await request(app.getHttpServer())
        .patch('/application/not-an-id/status')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ status: ApplicationStatus.ACCEPTED });
      expect(res.status).toBe(400);
    });

    it('should return 400 when status is not a valid ApplicationStatus enum value', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/application/${applicationId}/status`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ status: 'InvalidStatus' });
      expect(res.status).toBe(400);
    });

    it('should return 404 (APPLICATION_NOT_FOUND) when application does not exist', async () => {
      mockApplicationModel.findByPk.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .patch(`/application/${applicationId}/status`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ status: ApplicationStatus.ACCEPTED });

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        code: ApplicationErrorCode.APPLICATION_NOT_FOUND,
      });
    });

    it('should return 403 (NOT_AUTHORIZED) when user is neither company member nor creator', async () => {
      mockApplicationModel.findByPk.mockResolvedValue({
        id: applicationId,
        status: ApplicationStatus.PENDING,
        publication: { companyId: 50, createdByUserId: 999 },
      });
      mockCompanyMemberModel.findOne.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .patch(`/application/${applicationId}/status`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ status: ApplicationStatus.ACCEPTED });

      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({
        code: ApplicationErrorCode.NOT_AUTHORIZED,
      });
    });

    it('should return 200 and update status to Accepted when user is a company member', async () => {
      const saveMock = jest.fn().mockResolvedValue(undefined);
      mockApplicationModel.findByPk.mockResolvedValue({
        id: applicationId,
        status: ApplicationStatus.PENDING,
        publication: { companyId: 50, createdByUserId: 999 },
        save: saveMock,
        toJSON() {
          return { id: this.id, status: this.status };
        },
      });
      mockCompanyMemberModel.findOne.mockResolvedValue({
        id: 1,
        companyId: 50,
        userId: employerUserId,
      });

      const res = await request(app.getHttpServer())
        .patch(`/application/${applicationId}/status`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ status: ApplicationStatus.ACCEPTED });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: applicationId,
        status: ApplicationStatus.ACCEPTED,
      });
      expect(saveMock).toHaveBeenCalled();
    });

    it('should return 200 and update status to Rejected when user is the publication creator', async () => {
      const saveMock = jest.fn().mockResolvedValue(undefined);
      mockApplicationModel.findByPk.mockResolvedValue({
        id: applicationId,
        status: ApplicationStatus.PENDING,
        publication: { companyId: 50, createdByUserId: employerUserId },
        save: saveMock,
        toJSON() {
          return { id: this.id, status: this.status };
        },
      });
      mockCompanyMemberModel.findOne.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .patch(`/application/${applicationId}/status`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ status: ApplicationStatus.REJECTED });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: applicationId,
        status: ApplicationStatus.REJECTED,
      });
      expect(saveMock).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 6. DELETE /application/:id
  // =========================================================================
  describe('DELETE /application/:id', () => {
    const applicationId = 25;
    const workerProfile = { id: 100, userId: workerUserId };
    const otherWorkerProfile = { id: 101, userId: otherWorkerUserId };

    it('should return 401 when no token is provided', async () => {
      const res = await request(app.getHttpServer()).delete(`/application/${applicationId}`);
      expect(res.status).toBe(401);
    });

    it('should return 400 when id is not an integer', async () => {
      const res = await request(app.getHttpServer())
        .delete('/application/abc')
        .set('Authorization', `Bearer ${workerToken}`);
      expect(res.status).toBe(400);
    });

    it('should return 404 (WORKER_PROFILE_NOT_FOUND) when worker profile does not exist', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .delete(`/application/${applicationId}`)
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        code: ApplicationErrorCode.WORKER_PROFILE_NOT_FOUND,
      });
    });

    it('should return 404 (APPLICATION_NOT_FOUND) when application does not exist', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(workerProfile);
      mockApplicationModel.findByPk.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .delete(`/application/${applicationId}`)
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        code: ApplicationErrorCode.APPLICATION_NOT_FOUND,
      });
    });

    it('should return 403 (NOT_AUTHORIZED) when worker tries to cancel another worker application', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(otherWorkerProfile);
      mockApplicationModel.findByPk.mockResolvedValue({
        id: applicationId,
        workerId: workerProfile.id,
        status: ApplicationStatus.PENDING,
      });

      const res = await request(app.getHttpServer())
        .delete(`/application/${applicationId}`)
        .set('Authorization', `Bearer ${otherWorkerToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({
        code: ApplicationErrorCode.NOT_AUTHORIZED,
      });
    });

    it('should return 400 (CANNOT_CANCEL_PROCESSED) when application is already Accepted or Rejected', async () => {
      mockWorkersService.getWorkerByUserId.mockResolvedValue(workerProfile);
      mockApplicationModel.findByPk.mockResolvedValue({
        id: applicationId,
        workerId: workerProfile.id,
        status: ApplicationStatus.ACCEPTED,
      });

      const res = await request(app.getHttpServer())
        .delete(`/application/${applicationId}`)
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        code: ApplicationErrorCode.CANNOT_CANCEL_PROCESSED,
      });
    });

    it('should return 200 and delete the application when it is Pending and owned by the worker', async () => {
      const destroyMock = jest.fn().mockResolvedValue(undefined);
      mockWorkersService.getWorkerByUserId.mockResolvedValue(workerProfile);
      mockApplicationModel.findByPk.mockResolvedValue({
        id: applicationId,
        workerId: workerProfile.id,
        status: ApplicationStatus.PENDING,
        destroy: destroyMock,
      });

      const res = await request(app.getHttpServer())
        .delete(`/application/${applicationId}`)
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        message: 'Candidature annulée avec succès',
      });
      expect(destroyMock).toHaveBeenCalled();
    });
  });
});
