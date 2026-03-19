import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { SequelizeModule } from '@nestjs/sequelize';
import { getConnectionToken } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
// Import your actual module (e.g., PublicationModule)
import { PublicationModule } from '../src/modules/publication/publication.module';
import { Publication } from '../src/modules/publication/models/publication.model';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let sequelize: Sequelize;
  let apiRequest: request.SuperTest<request.Test>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        SequelizeModule.forRoot({
          dialect: 'postgres',
          host: 'localhost',
          port: 5432,
          username: 'postgres',
          password: 'Hyc12@3$#U$9&Ol2',
          database: 'koudmain',
          models: [Publication],
          autoLoadModels: true,
          synchronize: true,
          logging: false,
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
