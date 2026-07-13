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
            synchronize: false,
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

      await sequelize.query(
        `INSERT INTO "skill_category" (id, name) VALUES (1, 'Test Category') ON CONFLICT DO NOTHING;`,
      );
      await sequelize.query(
        `INSERT INTO "skill" (id, name, category_id) VALUES (0, 'Skill E2E Chat Test', 1) ON CONFLICT DO NOTHING;`,
      );

      authToken = await getAuthTokenForEmployer(app, 'employer1@koudmain.fr');
      console.log('Auth token obtenu pour les tests E2E', authToken);
    } catch (error) {
      console.error('Erreur Sequelize détaillée :', error);
      process.exit(1);
    }
  });

  afterAll(async () => {
    await sequelize.query('TRUNCATE TABLE "message" RESTART IDENTITY CASCADE;');
    await sequelize.query('TRUNCATE TABLE "conversation" RESTART IDENTITY CASCADE;');
    await sequelize.query('TRUNCATE TABLE "publication" RESTART IDENTITY CASCADE;');
    await app.close();
  });

  it('PRE-REQUIS : Récupérer un worker, une entreprise et créer une publication', async () => {
    const server = app.getHttpServer();

    const loginRes = await request(server).post('/auth/login').send({
      email: 'worker1@koudmain.fr',
      password: 'password123',
    });
    const authBodyWorker = loginRes.body as AuthResponse;
    const tokenWorker = authBodyWorker.accessToken;

    const workerUserId = JSON.parse(Buffer.from(tokenWorker.split('.')[1], 'base64').toString())
      .sub as number;
    const employerUserId = JSON.parse(Buffer.from(authToken.split('.')[1], 'base64').toString())
      .sub as number;

    const [workerProfileRows] = await sequelize.query(
      `SELECT id FROM "worker_profile" WHERE user_id = ${workerUserId}`,
    );
    workerId = (workerProfileRows[0] as { id: number }).id;

    const [companyRows] = await sequelize.query(
      `SELECT "company".id FROM "company" INNER JOIN "company_member" ON "company".id = "company_member".company_id WHERE "company_member".user_id = ${employerUserId} LIMIT 1`,
    );
    companyId = (companyRows[0] as { id: number }).id;

    const pubRes = await request(server)
      .post('/publication/create')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Développeur Fullstack E2E',
        description: 'Need a fullstack developer ASAP.',
        companyId: companyId,
        hourly_rate: 50,
        starting_date: new Date().toISOString(),
        ending_date: new Date(Date.now() + 86400000).toISOString(),
        skills: [0],
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
        publicationId: pubId,
        workerId: workerId,
        companyId: companyId,
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    const convBody = response.body as { id: number };
    convId = convBody.id;
  });

  it('POST /chat/messages - devrait envoyer un message', async () => {
    const payload = {
      conversationId: convId,
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
