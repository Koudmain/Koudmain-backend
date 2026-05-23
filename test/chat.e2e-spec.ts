/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule, getConnectionToken } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { AuthResponse, getAuthTokenForEmployer } from './utils/auth.helper';

import { PublicationModule } from '../src/modules/publication/publication.module';
import { CompaniesModule } from '../src/modules/companies/companies.module';
import { UsersModule } from '@/modules/users/users.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { DriveModule } from '@/modules/drive/drive.module';
import { PlanningModule } from '@/modules/planning/planning.module';
import { SkillModule } from '@/modules/skill/skill.module';
import { ChatModule } from '@/modules/chat/chat.module';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';

require('dotenv').config();

describe('Chat System (e2e)', () => {
  let app: INestApplication;
  let sequelize: Sequelize;
  let authToken: string;
  let companyId: number;
  let pubId: number;
  let convId: number;
  let workerId: number;

  beforeAll(async () => {
    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true }),
          SequelizeModule.forRoot({
            dialect: 'postgres',
            host: process.env.DB_TEST_HOST,
            port: parseInt(process.env.DB_TEST_DOCKER_PORT ?? '5432', 10),
            username: process.env.DB_TEST_USER || 'postgres',
            password: process.env.DB_TEST_PASSWORD || 'postgres',
            database: process.env.DB_TEST_NAME || 'koudmain_test',
            autoLoadModels: true,
            synchronize: true,
            retryAttempts: 3,
            retryDelay: 2000,
          }),
          UsersModule,
          AuthModule,
          CompaniesModule,
          DriveModule,
          PublicationModule,
          PlanningModule,
          SkillModule,
          ChatModule,
        ],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();

      sequelize = app.get<Sequelize>(getConnectionToken());
      authToken = await getAuthTokenForEmployer(app, 'recruteur@test.com');
      console.log('Auth token obtenu pour les tests E2E', authToken);
    } catch (error) {
      console.error('Erreur Sequelize détaillée :', error);
      process.exit(1);
    }
  });

  afterAll(async () => {
    await sequelize.query('TRUNCATE TABLE "user" RESTART IDENTITY CASCADE;');
    await sequelize.query('TRUNCATE TABLE "message" RESTART IDENTITY CASCADE;');
    await sequelize.query('TRUNCATE TABLE "conversation" RESTART IDENTITY CASCADE;');
    await sequelize.query('TRUNCATE TABLE "publication" RESTART IDENTITY CASCADE;');
    await sequelize.query('TRUNCATE TABLE "company" RESTART IDENTITY CASCADE;');
    await app.close();
  });

  it("PRE-REQUIS : Créer un user pour l'authentification", async () => {
    // Register
    await request(app.getHttpServer()).post('/auth/register').send({
      first_name: 'Test',
      last_name: 'E2E',
      email: 'test.e2e@example.com',
      password: 'password123',
      role: 'EMPLOYER',
    });

    // Login
    const response = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'test.e2e@example.com',
      password: 'password123',
      targetApp: 'employer',
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('access_token');

    const authBody = response.body as AuthResponse;
    authToken = authBody.access_token;
  });

  it('PRE-REQUIS : Créer un worker, une entreprise et une publication', async () => {
    const server = app.getHttpServer();

    await request(server).post('/auth/register').send({
      email: 'worker_test@gmail.com',
      password: 'Password123!',
      first_name: 'Worker',
      last_name: 'Test',
      role: 'WORKER',
    });
    const loginRes = await request(server).post('/auth/login').send({
      email: 'worker_test@gmail.com',
      password: 'Password123!',
      targetApp: 'worker',
    });
    const authBodyWorker = loginRes.body as AuthResponse;
    const tokenWorker = authBodyWorker.access_token;
    const workerProfileRes = await request(server)
      .get('/workers')
      .set('Authorization', `Bearer ${tokenWorker}`);
    const workerProfile = workerProfileRes.body as WorkerProfile;
    workerId = workerProfile.id;

    const coRes = await request(server)
      .get('/companies/my-companies')
      .set('Authorization', `Bearer ${authToken}`);

    const body = coRes.body as [{ id: number }];
    companyId = body[0].id;

    const pubRes = await request(server)
      .post('/publication/create')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Développeur Fullstack E2E',
        company_id: companyId,
        hourly_rate: 50,
      });

    const pubBody = pubRes.body as { id: number };
    pubId = pubBody.id;
    expect(pubRes.status).toBe(201);
  });

  it('POST /chat/conversations - devrait créer une conversation', async () => {
    const response = await request(app.getHttpServer())
      .post('/chat/conversations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        publication_id: pubId,
        worker_id: workerId,
        company_id: companyId,
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    const convBody = response.body as { id: number };
    convId = convBody.id;
  });

  it('POST /chat/messages - devrait envoyer un message', async () => {
    const payload = {
      conversation_id: convId,
      content: 'Salut, ceci est un test E2E avec token !',
    };

    const response = await request(app.getHttpServer())
      .post('/chat/messages')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body.content_text).toBe(payload.content);

    const [msgCheck]: any = await sequelize.query(
      `SELECT * FROM "message" WHERE conversation_id = ${convId} ORDER BY created_at DESC LIMIT 1;`,
    );
    expect(msgCheck.length).toBe(1);
    expect(msgCheck[0].content_text).toBe(payload.content);
  });

  it('GET /chat/conversations/:id/messages - historique', async () => {
    const response = await request(app.getHttpServer())
      .get(`/chat/conversations/${convId}/messages`)
      .set('Authorization', `Bearer ${authToken}`)
      .query({ limit: 10, offset: 0 });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });
});
