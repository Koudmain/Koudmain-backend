/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule, getConnectionToken } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { getAuthToken } from './utils/auth.helper';

import { PublicationModule } from '../src/modules/publication/publication.module';
import { CompaniesModule } from '../src/modules/companies/companies.module';
import { UsersModule } from '@/modules/users/users.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { DriveModule } from '@/modules/drive/drive.module';
import { PlanningModule } from '@/modules/planning/planning.module';
import { SkillModule } from '@/modules/skill/skill.module';

require('dotenv').config();

describe('Chat System (e2e)', () => {
  let app: INestApplication;
  let sequelize: Sequelize;
  let authToken: string;
  let companyId: number;
  let pubId: number;
  let convId: number;
  const workerId = 1;

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
        ],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();

      sequelize = app.get<Sequelize>(getConnectionToken());
      authToken = await getAuthToken(app, 'recruteur@test.com');
    } catch (error) {
      console.error('❌ Erreur Sequelize détaillée :', error);
      process.exit(1);
    }
  });

  afterAll(async () => {
    await sequelize.query('TRUNCATE TABLE "message" RESTART IDENTITY CASCADE;');
    await sequelize.query('TRUNCATE TABLE "conversation_setting" RESTART IDENTITY CASCADE;');
    await sequelize.query('TRUNCATE TABLE "conversation" RESTART IDENTITY CASCADE;');
    await sequelize.query('TRUNCATE TABLE "publication" RESTART IDENTITY CASCADE;');
    await sequelize.query('TRUNCATE TABLE "company" RESTART IDENTITY CASCADE;');
    await app.close();
  });

  it('PRE-REQUIS : Créer une entreprise et une publication', async () => {
    const server = app.getHttpServer();

    const coRes = await request(server)
      .post('/companies')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Entreprise Test E2E' });

    const body = coRes.body as { id: number };
    companyId = body.id;

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
