import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { getConnectionToken, SequelizeModule } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '@/modules/users/users.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { CompaniesModule } from '@/modules/companies/companies.module';
import { DriveModule } from '@/modules/drive/drive.module';
import { PublicationModule } from '@/modules/publication/publication.module';
import { PlanningModule } from '@/modules/planning/planning.module';

require('dotenv').config();

describe('Planning (e2e)', () => {
  let app: INestApplication;
  let sequelize: Sequelize;
  let workerToken: string;
  let employerToken: string;
  let companyId: number;

  beforeAll(async () => {
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
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    sequelize = app.get<Sequelize>(getConnectionToken());

    // Cleanup stale data from previous runs
    await sequelize.query(
      `DELETE FROM "application" WHERE publication_id IN (SELECT id FROM "publication" WHERE title = 'Planning Test Job');`,
    );
    await sequelize.query(`DELETE FROM "publication" WHERE title = 'Planning Test Job';`);
    await sequelize.query(`DELETE FROM "company" WHERE name = 'Test Company Planning';`);
    await sequelize.query(
      `DELETE FROM "user" WHERE email IN ('planning.worker@test.com', 'planning.employer@test.com', 'planning.noapp@test.com');`,
    );

    // Register and login worker
    await request(app.getHttpServer()).post('/auth/register').send({
      email: 'planning.worker@test.com',
      password: 'Password123!',
      first_name: 'Worker',
      last_name: 'Planning',
      is_worker_active: true,
    });
    const workerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'planning.worker@test.com', password: 'Password123!', targetApp: 'worker' });
    workerToken = workerLogin.body.access_token;

    // Register and login employer
    await request(app.getHttpServer()).post('/auth/register').send({
      email: 'planning.employer@test.com',
      password: 'Password123!',
      first_name: 'Employer',
      last_name: 'Planning',
      is_employer_active: true,
    });
    const employerLogin = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'planning.employer@test.com',
      password: 'Password123!',
      targetApp: 'employer',
    });
    employerToken = employerLogin.body.access_token;

    // Extract user IDs from JWT payloads (avoids DB query race conditions)
    const workerUserId = JSON.parse(Buffer.from(workerToken.split('.')[1], 'base64').toString())
      .sub as number;
    const employerUserId = JSON.parse(Buffer.from(employerToken.split('.')[1], 'base64').toString())
      .sub as number;

    // Create company
    const [companyRows] = await sequelize.query(
      `INSERT INTO "company" (name) VALUES ('Test Company Planning') RETURNING id`,
    );
    companyId = (companyRows[0] as { id: number }).id;

    // Add employer as company member
    await sequelize.query(
      `INSERT INTO "company_member" (company_id, user_id) VALUES (${companyId}, ${employerUserId})`,
    );

    // Create worker profile
    const [workerProfileRows] = await sequelize.query(
      `INSERT INTO "worker_profile" (user_id) VALUES (${workerUserId}) RETURNING id`,
    );
    const workerProfileId = (workerProfileRows[0] as { id: number }).id;

    // Create publication in current date range (employer owns it)
    const now = new Date();
    const startingDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endingDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const [pubRows] = await sequelize.query(
      `INSERT INTO "publication" (title, description, hourly_rate, starting_date, ending_date, company_id, created_by_user_id)
       VALUES ('Planning Test Job', 'Desc', 20.0, '${startingDate.toISOString()}', '${endingDate.toISOString()}', ${companyId}, ${employerUserId})
       RETURNING id`,
    );
    const pubId = (pubRows[0] as { id: number }).id;

    // Create accepted application for worker
    await sequelize.query(
      `INSERT INTO "application" (publication_id, worker_id, status)
       VALUES (${pubId}, ${workerProfileId}, 'Accepted')`,
    );

    // Create a pending application on the same publication (should not appear in planning)
    await sequelize.query(
      `INSERT INTO "application" (publication_id, worker_id, status)
       VALUES (${pubId}, ${workerProfileId}, 'Pending')`,
    );
  });

  afterAll(async () => {
    await sequelize.query(
      `DELETE FROM "application" WHERE publication_id IN (SELECT id FROM "publication" WHERE title = 'Planning Test Job');`,
    );
    await sequelize.query(`DELETE FROM "publication" WHERE title = 'Planning Test Job';`);
    await sequelize.query(`DELETE FROM "company" WHERE name = 'Test Company Planning';`);
    await sequelize.query(
      `DELETE FROM "user" WHERE email IN ('planning.worker@test.com', 'planning.employer@test.com', 'planning.noapp@test.com');`,
    );
    await app.close();
  });

  it('should return 401 when no token is provided', async () => {
    const res = await request(app.getHttpServer()).get('/planning');
    expect(res.status).toBe(401);
  });

  it('should return 403 when employer is not a member of the requested company', async () => {
    const res = await request(app.getHttpServer())
      .get('/planning?activeCompanyId=99999')
      .set('Authorization', `Bearer ${employerToken}`);
    expect(res.status).toBe(403);
  });

  it('should return worker planning with correct fields from DB', async () => {
    const res = await request(app.getHttpServer())
      .get('/planning')
      .set('Authorization', `Bearer ${workerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);

    const entry = res.body[0];
    expect(entry).toHaveProperty('publicationId');
    expect(entry).toHaveProperty('title', 'Planning Test Job');
    expect(Number(entry.salary)).toBe(20);
    expect(entry).toHaveProperty('company_name', 'Test Company Planning');
    expect(entry).toHaveProperty('companyRating');
    expect(entry).toHaveProperty('application_status');
  });

  it('should return employer planning with correct fields from DB', async () => {
    const res = await request(app.getHttpServer())
      .get(`/planning?activeCompanyId=${companyId}`)
      .set('Authorization', `Bearer ${employerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);

    const entry = res.body[0];
    expect(entry).toHaveProperty('publicationId');
    expect(entry).toHaveProperty('title', 'Planning Test Job');
    expect(Number(entry.salary)).toBe(20);
    expect(entry).toHaveProperty('worker_name', 'Worker Planning');
    expect(entry).toHaveProperty('workerRating');
  });

  it('should only return Accepted applications for employer, not Pending ones', async () => {
    // 2 applications exist (1 Accepted + 1 Pending) but employer should only see 1
    const res = await request(app.getHttpServer())
      .get(`/planning?activeCompanyId=${companyId}`)
      .set('Authorization', `Bearer ${employerToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('should return empty array when date range excludes existing publications', async () => {
    const res = await request(app.getHttpServer())
      .get('/planning?startDate=2000-01-01&endDate=2000-01-31')
      .set('Authorization', `Bearer ${workerToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('should return empty array for a worker with no applications', async () => {
    await request(app.getHttpServer()).post('/auth/register').send({
      email: 'planning.noapp@test.com',
      password: 'Password123!',
      first_name: 'No',
      last_name: 'App',
      is_worker_active: true,
    });
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'planning.noapp@test.com', password: 'Password123!', targetApp: 'worker' });
    const noAppToken = loginRes.body.access_token;

    const res = await request(app.getHttpServer())
      .get('/planning')
      .set('Authorization', `Bearer ${noAppToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);

    await sequelize.query(`DELETE FROM "user" WHERE email = 'planning.noapp@test.com';`);
  });
});
