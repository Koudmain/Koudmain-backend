import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { getConnectionToken } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { PublicationModule } from '../src/modules/publication/publication.module';
import { Publication } from '@/modules/publication/models/publication.model';
import { SkillModule } from '../src/modules/skill/skill.module';

require('dotenv').config();

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let sequelize: Sequelize;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        SequelizeModule.forRoot({
          dialect: 'postgres',
          host: process.env.DB_TEST_HOST,
          port: parseInt(process.env.DB_TEST_PORT ?? '5432', 10),
          username: process.env.DB_TEST_USER,
          password: process.env.DB_TEST_PASSWORD,
          database: process.env.DB_TEST_NAME,
          autoLoadModels: true,
          synchronize: false,
        }),
        PublicationModule,
        SkillModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    sequelize = app.get<Sequelize>(getConnectionToken());
  });

  afterAll(async () => {
    await sequelize.query('TRUNCATE TABLE "publication" RESTART IDENTITY CASCADE;');
    await sequelize.query('TRUNCATE TABLE "skill" RESTART IDENTITY CASCADE;');
    await app.close();
  });

  it('should create a publication without any foreign Key constraint field', async () => {
    const response = await request(app.getHttpServer()).post('/publication/create').send({
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
    const response = await request(app.getHttpServer()).get('/publication/get').send({});

    expect(response.status).toBe(200);

    expect(response.body).toBeInstanceOf(Array);

    const first_pub: Publication = response.body[0] ? response.body[0] : undefined;

    if (first_pub) {
      expect(first_pub.id).toBe(1);
    }
  });

  it('should edit the title of the first publication previously added by the test', async () => {
    const response = await request(app.getHttpServer())
      .put('/publication/update/1')
      .send({ title: 'Updated Title' });

    expect(response.status).toBe(200);

    const dbCheck = await sequelize.query(`SELECT * FROM "publication" WHERE id = 1;`);
    expect(dbCheck[0].length).toBe(1);
    expect((dbCheck[0][0] as any).title).toBe('Updated Title');
  });

  it('should delete the first publication previously added by the test', async () => {
    const response = await request(app.getHttpServer()).delete('/publication/delete/1').send({});

    expect(response.status).toBe(200);

    const dbCheck = await sequelize.query(`SELECT * FROM "publication" WHERE id = 1;`);
    expect(dbCheck[0].length).toBe(0);
  });

  it('should create a skill without any foreign Key constraint field', async () => {
    const response = await request(app.getHttpServer()).post('/skill/create').send({
      name: 'Skill TEST E2E',
    });

    console.log(response.body);

    expect(response.status).toBe(201);

    const dbCheck = await sequelize.query(
      `SELECT * FROM "skill" WHERE name = 'Skill TEST E2E';`,
    );
    expect(dbCheck[0].length).toBe(1);
    expect((dbCheck[0][0] as any).name).toBe('Skill TEST E2E');
  });

  it('should get all skill previously added by the test', async () => {
    const response = await request(app.getHttpServer()).get('/skill/get').send({});

    expect(response.status).toBe(200);

    expect(response.body).toBeInstanceOf(Array);

    const first_skill: Publication = response.body[0] ? response.body[0] : undefined;

    if (first_skill) {
      expect(first_skill.id).toBe(1);
    }
  });

  it('should get the first skill previously added by the test', async () => {
    const response = await request(app.getHttpServer()).get('/skill/get/1').send({});

    expect(response.status).toBe(200);

    const skill = response.body;

    expect(skill.id).toBe(1);
    expect(skill.name).toBe('Skill TEST E2E');
  });
});
