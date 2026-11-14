import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AuthGuard } from '@/modules/auth/auth.guard';
import { RolesGuard } from '@/modules/auth/roles.guard';
import { ChatController } from '@/modules/chat/controllers/chat.controller';
import { ChatService } from '@/modules/chat/services/chat.service';
import { CompaniesController } from '@/modules/companies/controllers/companies.controller';
import { CompaniesService } from '@/modules/companies/services/companies.service';
import { DriveService } from '@/modules/drive/drive.service';
import { PublicationController } from '@/modules/publication/controllers/publication.controller';
import { PublicationService } from '@/modules/publication/services/publication.service';
import { ReviewController } from '@/modules/review/controllers/review.controller';
import { PaymentReportType } from '@/modules/review/models/payment-report.model';
import { ReviewService } from '@/modules/review/services/review.service';
import { UsersController } from '@/modules/users/controllers/users.controller';
import { UserRole } from '@/modules/users/models/user.model';
import { UsersService } from '@/modules/users/services/users.service';
import { WorkersController } from '@/modules/workers/controllers/workers.controller';
import { WorkersService } from '@/modules/workers/services/workers.service';

describe('Role-Based Access Control (Functional / e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let workerToken: string;
  let employerToken: string;
  let tokenWithoutRole: string;

  const mockCompaniesService = {
    getUserCompanies: jest.fn().mockResolvedValue([{ id: 1, name: 'Koudmain Bistro' }]),
    getPublicProfile: jest.fn().mockResolvedValue({ id: 1, name: 'Koudmain Bistro' }),
    updateCompanyAddress: jest.fn().mockResolvedValue({ id: 1 }),
    updateCompany: jest.fn().mockResolvedValue({ id: 1 }),
  };

  const mockWorkersService = {
    getWorkerByUserId: jest.fn().mockResolvedValue({ id: 10, userId: 1 }),
    getOwnProfile: jest.fn().mockResolvedValue({ id: 10, bio: 'Serveur' }),
    updateOwnProfile: jest.fn().mockResolvedValue({ id: 10, bio: 'Chef de rang' }),
    getPublicProfile: jest.fn().mockResolvedValue({ id: 10, bio: 'Serveur' }),
  };

  const mockPublicationService = {
    create: jest.fn().mockResolvedValue({ id: 100, createdAt: new Date() }),
    getAll: jest.fn().mockResolvedValue([{ id: 100, title: 'Mission Serveur' }]),
    getById: jest.fn().mockResolvedValue({ id: 100, title: 'Mission Serveur' }),
    update: jest.fn().mockResolvedValue({ id: 100 }),
    delete: jest.fn().mockResolvedValue(undefined),
  };

  const mockChatService = {
    findOrCreateConversation: jest.fn().mockResolvedValue({ id: 50 }),
    getConversationsForWorker: jest.fn().mockResolvedValue([{ id: 50 }]),
    getConversationsForCompany: jest.fn().mockResolvedValue([{ id: 50 }]),
    getConversationDetailsForCompany: jest.fn().mockResolvedValue({ id: 50 }),
    getMessagesByConversation: jest.fn().mockResolvedValue([{ id: 1, content_text: 'Bonjour' }]),
    sendMessage: jest.fn().mockResolvedValue({ id: 2, content_text: 'Salut' }),
  };

  const mockReviewService = {
    createCompanyReview: jest.fn().mockResolvedValue({ id: 7 }),
    createPaymentReport: jest.fn().mockResolvedValue({ id: 8 }),
  };

  const mockUsersService = {
    findOneByIdPublic: jest.fn().mockResolvedValue({ id: 1, email: 'user@koudmain.fr' }),
    updateProfilePicture: jest.fn().mockResolvedValue([1]),
    update: jest.fn().mockResolvedValue([1]),
  };

  const mockDriveService = {
    uploadImage: jest.fn().mockResolvedValue('https://drive.com/img.png'),
    deleteFile: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'e2e-roles-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [
        CompaniesController,
        WorkersController,
        PublicationController,
        ChatController,
        ReviewController,
        UsersController,
      ],
      providers: [
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: CompaniesService, useValue: mockCompaniesService },
        { provide: WorkersService, useValue: mockWorkersService },
        { provide: PublicationService, useValue: mockPublicationService },
        { provide: ChatService, useValue: mockChatService },
        { provide: ReviewService, useValue: mockReviewService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: DriveService, useValue: mockDriveService },
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
    workerToken = jwtService.sign({
      sub: 1,
      email: 'worker@koudmain.fr',
      role: UserRole.WORKER,
    });
    employerToken = jwtService.sign({
      sub: 2,
      email: 'employer@koudmain.fr',
      role: UserRole.EMPLOYER,
    });
    tokenWithoutRole = jwtService.sign({
      sub: 3,
      email: 'legacy@koudmain.fr',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // 1. Authentication & Missing Role checks
  // =========================================================================
  describe('Authentication & Missing Role', () => {
    it('should return 401 when no token is provided on a protected route', async () => {
      const res = await request(app.getHttpServer()).get('/companies/my-companies');
      expect(res.status).toBe(401);
    });

    it('should return 403 when JWT payload does not contain a role on a @Roles route', async () => {
      const res = await request(app.getHttpServer())
        .get('/companies/my-companies')
        .set('Authorization', `Bearer ${tokenWithoutRole}`);
      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({
        statusCode: 403,
        error: 'Forbidden',
      });
    });
  });

  // =========================================================================
  // 2. EMPLOYER-only routes (/companies, /publication, /chat/company, /workers/:id/profile)
  // =========================================================================
  describe('EMPLOYER-only routes', () => {
    it('GET /companies/my-companies - should reject WORKER (403) and allow EMPLOYER (200)', async () => {
      const forbiddenRes = await request(app.getHttpServer())
        .get('/companies/my-companies')
        .set('Authorization', `Bearer ${workerToken}`);
      expect(forbiddenRes.status).toBe(403);

      const okRes = await request(app.getHttpServer())
        .get('/companies/my-companies')
        .set('Authorization', `Bearer ${employerToken}`);
      expect(okRes.status).toBe(200);
    });

    it('PUT /companies/:companyId/address - should reject WORKER (403) and allow EMPLOYER (200)', async () => {
      const addressPayload = {
        streetNumber: '10',
        streetName: 'Rue de Rivoli',
        zipCode: '75001',
        city: 'Paris',
        country: 'France',
      };

      const forbiddenRes = await request(app.getHttpServer())
        .put('/companies/1/address')
        .set('Authorization', `Bearer ${workerToken}`)
        .send(addressPayload);
      expect(forbiddenRes.status).toBe(403);

      const okRes = await request(app.getHttpServer())
        .put('/companies/1/address')
        .set('Authorization', `Bearer ${employerToken}`)
        .send(addressPayload);
      expect(okRes.status).toBe(200);
    });

    it('PATCH /companies/:companyId - should reject WORKER (403) and allow EMPLOYER (200)', async () => {
      const forbiddenRes = await request(app.getHttpServer())
        .patch('/companies/1')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ name: 'Nouveau Nom' });
      expect(forbiddenRes.status).toBe(403);

      const okRes = await request(app.getHttpServer())
        .patch('/companies/1')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ name: 'Nouveau Nom' });
      expect(okRes.status).toBe(200);
    });

    it('POST /publication/create - should reject WORKER (403) and allow EMPLOYER (201)', async () => {
      const pubPayload = {
        companyId: 1,
        createdByUserId: 2,
        address_id: 1,
        title: 'Serveur Extra',
        description: 'Service du soir',
        hourly_rate: 15,
        starting_date: new Date().toISOString(),
        ending_date: new Date(Date.now() + 86400000).toISOString(),
        skills: [1],
      };

      const forbiddenRes = await request(app.getHttpServer())
        .post('/publication/create')
        .set('Authorization', `Bearer ${workerToken}`)
        .send(pubPayload);
      expect(forbiddenRes.status).toBe(403);

      const okRes = await request(app.getHttpServer())
        .post('/publication/create')
        .set('Authorization', `Bearer ${employerToken}`)
        .send(pubPayload);
      expect(okRes.status).toBe(201);
    });

    it('PUT /publication/update/:id - should reject WORKER (403) and allow EMPLOYER (200)', async () => {
      const forbiddenRes = await request(app.getHttpServer())
        .put('/publication/update/100')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ title: 'Titre modifié' });
      expect(forbiddenRes.status).toBe(403);

      const okRes = await request(app.getHttpServer())
        .put('/publication/update/100')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ title: 'Titre modifié' });
      expect(okRes.status).toBe(200);
    });

    it('DELETE /publication/delete/:id - should reject WORKER (403) and allow EMPLOYER (200)', async () => {
      const forbiddenRes = await request(app.getHttpServer())
        .delete('/publication/delete/100')
        .set('Authorization', `Bearer ${workerToken}`);
      expect(forbiddenRes.status).toBe(403);

      const okRes = await request(app.getHttpServer())
        .delete('/publication/delete/100')
        .set('Authorization', `Bearer ${employerToken}`);
      expect(okRes.status).toBe(200);
    });

    it('GET /chat/company/:companyId/conversations - should reject WORKER (403) and allow EMPLOYER (200)', async () => {
      const forbiddenRes = await request(app.getHttpServer())
        .get('/chat/company/1/conversations')
        .set('Authorization', `Bearer ${workerToken}`);
      expect(forbiddenRes.status).toBe(403);

      const okRes = await request(app.getHttpServer())
        .get('/chat/company/1/conversations')
        .set('Authorization', `Bearer ${employerToken}`);
      expect(okRes.status).toBe(200);
    });

    it('GET /chat/company/conversations/:conversationId - should reject WORKER (403) and allow EMPLOYER (200)', async () => {
      const forbiddenRes = await request(app.getHttpServer())
        .get('/chat/company/conversations/50')
        .set('Authorization', `Bearer ${workerToken}`);
      expect(forbiddenRes.status).toBe(403);

      const okRes = await request(app.getHttpServer())
        .get('/chat/company/conversations/50')
        .set('Authorization', `Bearer ${employerToken}`);
      expect(okRes.status).toBe(200);
    });

    it('GET /workers/:workerId/profile - should reject WORKER (403) and allow EMPLOYER (200)', async () => {
      const forbiddenRes = await request(app.getHttpServer())
        .get('/workers/10/profile')
        .set('Authorization', `Bearer ${workerToken}`);
      expect(forbiddenRes.status).toBe(403);

      const okRes = await request(app.getHttpServer())
        .get('/workers/10/profile')
        .set('Authorization', `Bearer ${employerToken}`);
      expect(okRes.status).toBe(200);
    });
  });

  // =========================================================================
  // 3. WORKER-only routes (/workers, /chat/worker, /review)
  // =========================================================================
  describe('WORKER-only routes', () => {
    it('GET /workers - should reject EMPLOYER (403) and allow WORKER (200)', async () => {
      const forbiddenRes = await request(app.getHttpServer())
        .get('/workers')
        .set('Authorization', `Bearer ${employerToken}`);
      expect(forbiddenRes.status).toBe(403);

      const okRes = await request(app.getHttpServer())
        .get('/workers')
        .set('Authorization', `Bearer ${workerToken}`);
      expect(okRes.status).toBe(200);
    });

    it('GET /workers/me/profile - should reject EMPLOYER (403) and allow WORKER (200)', async () => {
      const forbiddenRes = await request(app.getHttpServer())
        .get('/workers/me/profile')
        .set('Authorization', `Bearer ${employerToken}`);
      expect(forbiddenRes.status).toBe(403);

      const okRes = await request(app.getHttpServer())
        .get('/workers/me/profile')
        .set('Authorization', `Bearer ${workerToken}`);
      expect(okRes.status).toBe(200);
    });

    it('PATCH /workers/me - should reject EMPLOYER (403) and allow WORKER (200)', async () => {
      const forbiddenRes = await request(app.getHttpServer())
        .patch('/workers/me')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ bio: 'Nouvelle bio' });
      expect(forbiddenRes.status).toBe(403);

      const okRes = await request(app.getHttpServer())
        .patch('/workers/me')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ bio: 'Nouvelle bio' });
      expect(okRes.status).toBe(200);
    });

    it('GET /chat/worker/conversations - should reject EMPLOYER (403) and allow WORKER (200)', async () => {
      const forbiddenRes = await request(app.getHttpServer())
        .get('/chat/worker/conversations')
        .set('Authorization', `Bearer ${employerToken}`);
      expect(forbiddenRes.status).toBe(403);

      const okRes = await request(app.getHttpServer())
        .get('/chat/worker/conversations')
        .set('Authorization', `Bearer ${workerToken}`);
      expect(okRes.status).toBe(200);
    });

    it('POST /review/mission/:missionId - should reject EMPLOYER (403) and allow WORKER (201)', async () => {
      const reviewPayload = { rating: 5, comment: 'Très bon établissement' };

      const forbiddenRes = await request(app.getHttpServer())
        .post('/review/mission/10')
        .set('Authorization', `Bearer ${employerToken}`)
        .send(reviewPayload);
      expect(forbiddenRes.status).toBe(403);

      const okRes = await request(app.getHttpServer())
        .post('/review/mission/10')
        .set('Authorization', `Bearer ${workerToken}`)
        .send(reviewPayload);
      expect(okRes.status).toBe(201);
    });

    it('POST /review/mission/:missionId/payment-report - should reject EMPLOYER (403) and allow WORKER (201)', async () => {
      const reportPayload = {
        reportType: PaymentReportType.LATE_PAYMENT,
        description: 'Le paiement a plus de 5 jours de retard.',
      };

      const forbiddenRes = await request(app.getHttpServer())
        .post('/review/mission/10/payment-report')
        .set('Authorization', `Bearer ${employerToken}`)
        .send(reportPayload);
      expect(forbiddenRes.status).toBe(403);

      const okRes = await request(app.getHttpServer())
        .post('/review/mission/10/payment-report')
        .set('Authorization', `Bearer ${workerToken}`)
        .send(reportPayload);
      expect(okRes.status).toBe(201);
    });
  });

  // =========================================================================
  // 4. Shared routes (accessible to both WORKER and EMPLOYER) & removed /users
  // =========================================================================
  describe('Shared routes & removed /users route', () => {
    it('GET /companies/:companyId/profile - should allow both WORKER and EMPLOYER (200)', async () => {
      const workerRes = await request(app.getHttpServer())
        .get('/companies/1/profile')
        .set('Authorization', `Bearer ${workerToken}`);
      expect(workerRes.status).toBe(200);

      const employerRes = await request(app.getHttpServer())
        .get('/companies/1/profile')
        .set('Authorization', `Bearer ${employerToken}`);
      expect(employerRes.status).toBe(200);
    });

    it('GET /publication/get & GET /publication/:id - should allow both WORKER and EMPLOYER (200)', async () => {
      const workerListRes = await request(app.getHttpServer())
        .get('/publication/get')
        .set('Authorization', `Bearer ${workerToken}`);
      expect(workerListRes.status).toBe(200);

      const employerDetailRes = await request(app.getHttpServer())
        .get('/publication/100')
        .set('Authorization', `Bearer ${employerToken}`);
      expect(employerDetailRes.status).toBe(200);
    });

    it('GET /chat/conversations/:id/messages - should allow both WORKER and EMPLOYER (200)', async () => {
      const workerHistoryRes = await request(app.getHttpServer())
        .get('/chat/conversations/50/messages')
        .set('Authorization', `Bearer ${workerToken}`);
      expect(workerHistoryRes.status).toBe(200);

      const employerHistoryRes = await request(app.getHttpServer())
        .get('/chat/conversations/50/messages')
        .set('Authorization', `Bearer ${employerToken}`);
      expect(employerHistoryRes.status).toBe(200);
    });

    it('GET /users/me - should allow both WORKER and EMPLOYER (200)', async () => {
      const workerMe = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${workerToken}`);
      expect(workerMe.status).toBe(200);

      const employerMe = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${employerToken}`);
      expect(employerMe.status).toBe(200);
    });

    it('GET /users - removed route should return 404 Not Found', async () => {
      const res = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${employerToken}`);
      expect(res.status).toBe(404);
    });
  });
});
