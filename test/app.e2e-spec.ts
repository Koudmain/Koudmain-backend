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
import { AuthResponse } from './utils/auth.helper';

require('dotenv').config();

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let sequelize: Sequelize;
  let accessToken: string;

  let publicationCategoryId: number;
  let publicationSkillId: number;
  let publicationSkillName: string;
  let publicationId: number;

  let standaloneCategoryId: number;
  let standaloneCategoryName: string;
  let standaloneSkillId: number;
  let standaloneSkillName: string;

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
      console.error('Erreur Sequelize détaillée :', error);
      process.exit(1);
    }
  });

  afterAll(async () => {
    if (publicationId) {
      await sequelize.query(
        `DELETE FROM "publication_skill" WHERE publication_id = ${publicationId};`,
      );
      await sequelize.query(`DELETE FROM "publication" WHERE id = ${publicationId};`);
    }
    if (publicationSkillId) {
      await sequelize.query(`DELETE FROM "skill" WHERE id = ${publicationSkillId};`);
    }
    if (publicationCategoryId) {
      await sequelize.query(`DELETE FROM "skill_category" WHERE id = ${publicationCategoryId};`);
    }
    if (standaloneSkillId) {
      await sequelize.query(`DELETE FROM "skill" WHERE id = ${standaloneSkillId};`);
    }
    if (standaloneCategoryId) {
      await sequelize.query(`DELETE FROM "skill_category" WHERE id = ${standaloneCategoryId};`);
    }
    await app.close();
  });

  it('should login a user to get an access token', async () => {
    // Login
    const response = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'employer1@koudmain.fr',
      password: 'password123',
    });

    console.log('Login Response:', response.body);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');

    const authBody = response.body as AuthResponse;
    accessToken = authBody.accessToken;
  });

  it('should create a publication with associated skills', async () => {
    const suffix = Date.now();
    const categoryName = `E2E Publication Test Category ${suffix}`;
    publicationSkillName = `Skill E2E Publication Test ${suffix}`;

    const categoryInsert = await sequelize.query(
      `INSERT INTO "skill_category" (name) VALUES ('${categoryName}') RETURNING id;`,
    );
    publicationCategoryId = (categoryInsert[0][0] as { id: number }).id;

    const skillResponse = await request(app.getHttpServer())
      .post('/skill/create')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: publicationSkillName, category_id: publicationCategoryId });

    expect(skillResponse.status).toBe(201);
    publicationSkillId = (skillResponse.body as { id: number }).id;

    const publicationTitle = `E2E Database Test ${suffix}`;
    const response = await request(app.getHttpServer())
      .post('/publication/create')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: publicationTitle,
        description: "This shouldn't be mocked!",
        hourly_rate: 25.5,
        starting_date: new Date(),
        ending_date: new Date(),
        skills: [publicationSkillId],
      });

    expect(response.status).toBe(201);
    publicationId = (response.body as { id: number }).id;

    const dbCheck = await sequelize.query(
      `SELECT * FROM "publication" WHERE id = ${publicationId};`,
    );
    expect(dbCheck[0].length).toBe(1);
    expect((dbCheck[0][0] as any).title).toBe(publicationTitle);
    expect((dbCheck[0][0] as any).description).toBe("This shouldn't be mocked!");

    const relCheck = await sequelize.query(
      `SELECT * FROM "publication_skill" WHERE publication_id = ${publicationId};`,
    );
    expect(relCheck[0].length).toBe(1);
  });

  it('should get all publication previously added by the test', async () => {
    const response = await request(app.getHttpServer())
      .get('/publication/get')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);

    const createdPublication = (response.body as Array<Record<string, any>>).find(
      (pub) => pub.id === publicationId,
    );

    expect(createdPublication).toBeDefined();
    expect(createdPublication?.skills).toBeInstanceOf(Array);
    expect(createdPublication?.skills[0].id).toBe(publicationSkillId);
    expect(createdPublication?.skills[0].name).toBe(publicationSkillName);
  });

  it('should edit the title and skills of the publication previously added by the test', async () => {
    const response = await request(app.getHttpServer())
      .put(`/publication/update/${publicationId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Updated Title', skills: [] });

    expect(response.status).toBe(200);

    const dbCheck = await sequelize.query(
      `SELECT * FROM "publication" WHERE id = ${publicationId};`,
    );
    expect(dbCheck[0].length).toBe(1);
    expect((dbCheck[0][0] as any).title).toBe('Updated Title');

    const skillCheck = await sequelize.query(
      `SELECT * FROM "publication_skill" WHERE publication_id = ${publicationId};`,
    );
    expect(skillCheck[0].length).toBe(0);
  });

  it('should delete the publication previously added by the test', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/publication/delete/${publicationId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(response.status).toBe(200);

    const dbCheck = await sequelize.query(
      `SELECT * FROM "publication" WHERE id = ${publicationId};`,
    );
    expect(dbCheck[0].length).toBe(0);

    // The publication row is gone; clear the id so afterAll doesn't try to delete it again.
    publicationId = undefined as unknown as number;
  });

  it('should create a skill without any foreign Key constraint field', async () => {
    const suffix = Date.now();
    standaloneCategoryName = `E2E Skill Test Category ${suffix}`;
    standaloneSkillName = `Skill TEST E2E ${suffix}`;

    const categoryInsert = await sequelize.query(
      `INSERT INTO "skill_category" (name) VALUES ('${standaloneCategoryName}') RETURNING id;`,
    );
    standaloneCategoryId = (categoryInsert[0][0] as { id: number }).id;

    const response = await request(app.getHttpServer())
      .post('/skill/create')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: standaloneSkillName,
        category_id: standaloneCategoryId,
      });

    expect(response.status).toBe(201);
    standaloneSkillId = (response.body as { id: number }).id;

    const dbCheck = await sequelize.query(`SELECT * FROM "skill" WHERE id = ${standaloneSkillId};`);
    expect(dbCheck[0].length).toBe(1);
    expect((dbCheck[0][0] as any).name).toBe(standaloneSkillName);
    expect((dbCheck[0][0] as any).category_id).toBe(standaloneCategoryId);
  });

  it('should get all skill previously added by the test', async () => {
    const response = await request(app.getHttpServer())
      .get('/skill/get')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);

    const createdSkill = (response.body as Array<Record<string, any>>).find(
      (skill) => skill.id === standaloneSkillId,
    );
    expect(createdSkill).toBeDefined();
    expect(createdSkill?.name).toBe(standaloneSkillName);
  });

  it('should get the skill previously added by the test', async () => {
    const response = await request(app.getHttpServer())
      .get(`/skill/get/${standaloneSkillId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(response.status).toBe(200);

    const skill = response.body;

    expect(skill.id).toBe(standaloneSkillId);
    expect(skill.name).toBe(standaloneSkillName);
    expect(skill.category).toStrictEqual(
      SkillCategory.build({ id: standaloneCategoryId, name: standaloneCategoryName }).get({
        plain: true,
      }),
    );
  });

  it('should get skills by category ID', async () => {
    const response = await request(app.getHttpServer())
      .get(`/skill/category/${standaloneCategoryId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0].category).toStrictEqual(
      SkillCategory.build({ id: standaloneCategoryId, name: standaloneCategoryName }).get({
        plain: true,
      }),
    );
  });
});
