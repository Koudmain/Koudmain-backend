import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { getConnectionToken, SequelizeModule } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { PublicationModule } from '@/modules/publication/publication.module';
import { SkillModule } from '@/modules/skill/skill.module';
import { CompaniesModule } from '@/modules/companies/companies.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '@/modules/users/users.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { DriveModule } from '@/modules/drive/drive.module';
import { PlanningModule } from '@/modules/planning/planning.module';
import { SkillCategory } from '@/modules/skill-category/models/skill-category.model';

require('dotenv').config();

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let sequelize: Sequelize;
  let accessToken: string;

  beforeAll(async () => {
    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true }),
          SequelizeModule.forRoot({
            dialect: 'postgres',
            host: process.env.DB_TEST_HOST,
            port: parseInt(process.env.DB_TEST_DOCKER_PORT ?? '5432', 10),
            username: process.env.DB_TEST_USER,
            password: process.env.DB_TEST_PASSWORD,
            database: process.env.DB_TEST_NAME,
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
    } catch (error) {
      console.error('❌ Erreur Sequelize détaillée :', error);
      process.exit(1);
    }
  });

  afterAll(async () => {
    await sequelize.query('TRUNCATE TABLE "user" RESTART IDENTITY CASCADE;');
    await sequelize.query('TRUNCATE TABLE "publication" RESTART IDENTITY CASCADE;');
    await sequelize.query('TRUNCATE TABLE "skill" RESTART IDENTITY CASCADE;');
    await sequelize.query('TRUNCATE TABLE "skill_category" RESTART IDENTITY CASCADE;');
    await app.close();
  });

  it('should register and login a user to get an access token', async () => {
    // Register
    await request(app.getHttpServer()).post('/auth/register').send({
      first_name: 'Test',
      last_name: 'E2E',
      email: 'test.e2e@example.com',
      password: 'password123',
      is_worker_active: true,
      is_employer_active: true,
    });

    // Login
    const response = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'test.e2e@example.com',
      password: 'password123',
      targetApp: 'employer',
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('access_token');

    accessToken = response.body.access_token;
  });

  it('should create a publication without any foreign Key constraint field', async () => {
    const response = await request(app.getHttpServer())
      .post('/publication/create')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'E2E Database Test',
        description: "This shouldn\'t be mocked!",
        hourly_rate: 25.5,
        starting_date: new Date(),
        ending_date: new Date(),
      });

    expect(response.status).toBe(201);

    const dbCheck = await sequelize.query(
      `SELECT * FROM "publication" WHERE title = 'E2E Database Test';`,
    );
    expect(dbCheck[0].length).toBe(1);
    expect((dbCheck[0][0] as any).description).toBe("This shouldn't be mocked!");
  });

  it('should get all publication previously added by the test', async () => {
    const response = await request(app.getHttpServer())
      .get('/publication/get')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(response.status).toBe(200);

    expect(response.body).toBeInstanceOf(Array);

    const first_pub: Record<string, any> = response.body[0] ? response.body[0] : undefined;

    if (first_pub) {
      expect(first_pub.id).toBe(1);
    }
  });

  it('should edit the title of the first publication previously added by the test', async () => {
    const response = await request(app.getHttpServer())
      .put('/publication/update/1')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Updated Title' });

    expect(response.status).toBe(200);

    const dbCheck = await sequelize.query(`SELECT * FROM "publication" WHERE id = 1;`);
    expect(dbCheck[0].length).toBe(1);
    expect((dbCheck[0][0] as any).title).toBe('Updated Title');
  });

  it('should delete the first publication previously added by the test', async () => {
    const response = await request(app.getHttpServer())
      .delete('/publication/delete/1')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(response.status).toBe(200);

    const dbCheck = await sequelize.query(`SELECT * FROM "publication" WHERE id = 1;`);
    expect(dbCheck[0].length).toBe(0);
  });

  it('should create a skill without any foreign Key constraint field', async () => {
    await sequelize.query(
      `INSERT INTO "skill_category" (id, name) VALUES (1, 'Test Category') ON CONFLICT DO NOTHING;`,
    );

    const response = await request(app.getHttpServer())
      .post('/skill/create')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Skill TEST E2E',
        category_id: 1,
      });

    console.log(response.body);

    expect(response.status).toBe(201);

    const dbCheck = await sequelize.query(`SELECT * FROM "skill" WHERE name = 'Skill TEST E2E';`);
    expect(dbCheck[0].length).toBe(1);
    expect((dbCheck[0][0] as any).name).toBe('Skill TEST E2E');
    expect((dbCheck[0][0] as any).category_id).toBe(1);
  });

  it('should get all skill previously added by the test', async () => {
    const response = await request(app.getHttpServer())
      .get('/skill/get')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(response.status).toBe(200);

    expect(response.body).toBeInstanceOf(Array);

    const first_skill: Record<string, any> = response.body[0] ? response.body[0] : undefined;

    if (first_skill) {
      expect(first_skill.id).toBe(1);
    }
  });

  it('should get the first skill previously added by the test', async () => {
    const response = await request(app.getHttpServer())
      .get('/skill/get/1')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(response.status).toBe(200);

    const skill = response.body;

    expect(skill.id).toBe(1);
    expect(skill.name).toBe('Skill TEST E2E');
    expect(skill.category).toStrictEqual(
      SkillCategory.build({ id: 1, name: 'Test Category' }).get({ plain: true }),
    );
  });

  it('should get skills by category ID', async () => {
    const response = await request(app.getHttpServer())
      .get('/skill/category/1')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0].category).toStrictEqual(
      SkillCategory.build({ id: 1, name: 'Test Category' }).get({ plain: true }),
    );
  });
});
