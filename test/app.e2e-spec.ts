import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { getConnectionToken } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { PublicationModule } from '../src/modules/publication/publication.module';

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
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    sequelize = app.get<Sequelize>(getConnectionToken());
  });

  beforeEach(async () => {
    await sequelize.query('TRUNCATE TABLE "publication" RESTART IDENTITY CASCADE;');
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a publication without any foreign Key constraint field', async () => {
    const response = await request(app.getHttpServer())
      .post('/publication/create')
      .send({
        title: "E2E Database Test",
        description: "This shouldn\'t be mocked!",
        hourly_rate: 25.50,
        starting_date: new Date(),
        ending_date: new Date(),
      });

    expect(response.status).toBe(201);

    const dbCheck = await sequelize.query(
      `SELECT * FROM "publication" WHERE title = 'E2E Database Test';`
    );
    expect(dbCheck[0].length).toBe(1);
    expect((dbCheck[0][0] as any).description).toBe('This shouldn\'t be mocked!');
  });
});
