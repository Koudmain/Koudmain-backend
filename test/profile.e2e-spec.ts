import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { getConnectionToken, SequelizeModule } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '@/modules/users/users.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { CompaniesModule } from '@/modules/companies/companies.module';
import { DriveModule } from '@/modules/drive/drive.module';
import { WorkersModule } from '@/modules/workers/workers.module';
import { AddressModule } from '@/modules/address/address.module';
import { ReviewModule } from '@/modules/review/review.module';
import { PublicationModule } from '@/modules/publication/publication.module';
import { SkillModule } from '@/modules/skill/skill.module';
import { SkillCategoryModule } from '@/modules/skill-category/skill-category.module';
import { AuthResponse } from './utils/auth.helper';

require('dotenv').config();

type Row = Record<string, unknown>;

interface ProfileReview {
  author: { name: string; pictureUrl: string | null; profileId: number | null };
}

const login = async (app: INestApplication, email: string) => {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password: 'password123' });

  return (res.body as AuthResponse).accessToken;
};

describe('Profiles & reviews (e2e)', () => {
  let app: INestApplication;
  let sequelize: Sequelize;

  let worker1Token: string;
  let worker9Token: string;
  let employer1Token: string;
  let employer2Token: string;

  let companyId: number;
  let worker1ProfileId: number;
  let worker9ProfileId: number;
  let reviewMissionId: number;

  let worker9Snapshot: Row;
  let worker9Jobs: Row[];
  let worker9Experiences: Row[];
  let worker9Formations: Row[];
  let companySnapshot: Row;

  const select = async (sql: string) => (await sequelize.query(sql))[0] as Row[];

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
          logging: false,
          retryAttempts: 3,
          retryDelay: 2000,
        }),
        UsersModule,
        AuthModule,
        CompaniesModule,
        DriveModule,
        WorkersModule,
        AddressModule,
        ReviewModule,
        PublicationModule,
        SkillModule,
        SkillCategoryModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    sequelize = app.get<Sequelize>(getConnectionToken());

    [worker1Token, worker9Token, employer1Token, employer2Token] = await Promise.all([
      login(app, 'worker1@koudmain.fr'),
      login(app, 'worker9@koudmain.fr'),
      login(app, 'employer1@koudmain.fr'),
      login(app, 'employer2@koudmain.fr'),
    ]);

    const [company] = await select(
      `SELECT c.* FROM company c
       JOIN company_member cm ON cm.company_id = c.id
       JOIN "user" u ON u.id = cm.user_id
       WHERE u.email = 'employer1@koudmain.fr' LIMIT 1;`,
    );
    companySnapshot = company;
    companyId = company.id as number;

    const workerRows = await select(
      `SELECT wp.*, u.email FROM worker_profile wp JOIN "user" u ON u.id = wp.user_id
       WHERE u.email IN ('worker1@koudmain.fr', 'worker9@koudmain.fr');`,
    );
    worker1ProfileId = workerRows.find((row) => row.email === 'worker1@koudmain.fr')!.id as number;
    worker9Snapshot = workerRows.find((row) => row.email === 'worker9@koudmain.fr')!;
    worker9ProfileId = worker9Snapshot.id as number;

    worker9Jobs = await select(`SELECT * FROM worker_job WHERE worker_id = ${worker9ProfileId};`);
    worker9Experiences = await select(
      `SELECT * FROM worker_experience WHERE worker_id = ${worker9ProfileId};`,
    );
    worker9Formations = await select(
      `SELECT * FROM worker_formation WHERE worker_id = ${worker9ProfileId};`,
    );

    const [publication] = await select(
      `SELECT id FROM publication WHERE company_id = ${companyId} LIMIT 1;`,
    );
    const [mission] = await select(
      `INSERT INTO mission (publication_id, worker_id, company_id, status, paid_at, payment_due_date)
       VALUES (${publication.id as number}, ${worker9ProfileId}, ${companyId}, 'Completed', NOW(), NOW())
       RETURNING id;`,
    );
    reviewMissionId = mission.id as number;
  });

  afterAll(async () => {
    if (!sequelize || !reviewMissionId) return app?.close();
    const queryInterface = sequelize.getQueryInterface();

    await sequelize.query(`DELETE FROM payment_report WHERE mission_id = ${reviewMissionId};`);
    await sequelize.query(`DELETE FROM review WHERE mission_id = ${reviewMissionId};`);
    await sequelize.query(`DELETE FROM mission WHERE id = ${reviewMissionId};`);

    await sequelize.query(
      `UPDATE worker_profile SET bio = :bio, work_radius = :workRadius WHERE id = :id;`,
      {
        replacements: {
          bio: worker9Snapshot.bio,
          workRadius: worker9Snapshot.work_radius,
          id: worker9ProfileId,
        },
      },
    );
    for (const [table, rows] of [
      ['worker_job', worker9Jobs],
      ['worker_experience', worker9Experiences],
      ['worker_formation', worker9Formations],
    ] as const) {
      await sequelize.query(`DELETE FROM ${table} WHERE worker_id = ${worker9ProfileId};`);
      if (rows.length > 0) await queryInterface.bulkInsert(table, rows);
    }

    const { id, ...companyColumns } = companySnapshot;
    await queryInterface.bulkUpdate('company', companyColumns, { id });

    await app.close();
  });

  describe('GET /workers/me/profile', () => {
    it('should return 401 without a token', async () => {
      const res = await request(app.getHttpServer()).get('/workers/me/profile');
      expect(res.status).toBe(401);
    });

    it('should return the own profile with the work radius and links to reviewing companies', async () => {
      const res = await request(app.getHttpServer())
        .get('/workers/me/profile')
        .set('Authorization', `Bearer ${worker1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(worker1ProfileId);
      expect(res.body.workRadius).toEqual(expect.any(Number));
      expect(res.body.user).not.toHaveProperty('password');
      expect(res.body.reviews.length).toBeGreaterThan(0);
      expect(res.body.reviews[0].author).toEqual({
        name: companySnapshot.name,
        pictureUrl: companySnapshot.logo_url,
        profileId: companyId,
      });
    });
  });

  describe('GET /workers/:workerId/profile', () => {
    it('should hide the reviewers profile ids and the work radius from an employer', async () => {
      const res = await request(app.getHttpServer())
        .get(`/workers/${worker1ProfileId}/profile`)
        .set('Authorization', `Bearer ${employer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty('workRadius');
      expect(
        (res.body.reviews as ProfileReview[]).every((review) => review.author.profileId === null),
      ).toBe(true);
    });

    it('should return 404 for an unknown worker', async () => {
      const res = await request(app.getHttpServer())
        .get('/workers/999999/profile')
        .set('Authorization', `Bearer ${employer1Token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /workers/me', () => {
    it('should update the profile and replace skills, experiences and formations', async () => {
      const res = await request(app.getHttpServer())
        .patch('/workers/me')
        .set('Authorization', `Bearer ${worker9Token}`)
        .send({
          bio: 'E2E bio',
          workRadius: 42,
          skillCategoryIds: [1, 2],
          experiences: [{ title: 'E2E waiter', durationMonths: 18 }],
          formations: [{ title: 'E2E diploma', type: 'DIPLOMA', obtainedDate: '2022-06-30' }],
        });

      expect(res.status).toBe(200);
      expect(res.body.bio).toBe('E2E bio');
      expect(res.body.workRadius).toBe(42);
      expect(res.body.skills.map((skill: { id: number }) => skill.id).sort()).toEqual([1, 2]);
      expect(res.body.experiences).toEqual([
        expect.objectContaining({ title: 'E2E waiter', durationMonths: 18 }),
      ]);
      expect(res.body.formations).toEqual([
        expect.objectContaining({
          title: 'E2E diploma',
          type: 'DIPLOMA',
          obtainedDate: '2022-06-30',
        }),
      ]);
    });

    it('should leave the lists untouched when they are not sent', async () => {
      const res = await request(app.getHttpServer())
        .patch('/workers/me')
        .set('Authorization', `Bearer ${worker9Token}`)
        .send({ bio: 'E2E bio updated' });

      expect(res.status).toBe(200);
      expect(res.body.bio).toBe('E2E bio updated');
      expect(res.body.workRadius).toBe(42);
      expect(res.body.experiences).toHaveLength(1);
      expect(res.body.formations).toHaveLength(1);
    });

    it('should reject an invalid body with 400', async () => {
      const res = await request(app.getHttpServer())
        .patch('/workers/me')
        .set('Authorization', `Bearer ${worker9Token}`)
        .send({ skillCategoryIds: [], experiences: [{ title: '' }], unknownField: true });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /companies/:companyId/profile', () => {
    it('should give company members the profile ids of the workers who reviewed it', async () => {
      const res = await request(app.getHttpServer())
        .get(`/companies/${companyId}/profile`)
        .set('Authorization', `Bearer ${employer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.reviews.length).toBeGreaterThan(0);
      expect(
        (res.body.reviews as ProfileReview[]).every(
          (review) => typeof review.author.profileId === 'number',
        ),
      ).toBe(true);
    });

    it('should hide the reviewers profile ids from people outside the company', async () => {
      const res = await request(app.getHttpServer())
        .get(`/companies/${companyId}/profile`)
        .set('Authorization', `Bearer ${worker1Token}`);

      expect(res.status).toBe(200);
      expect(
        (res.body.reviews as ProfileReview[]).every((review) => review.author.profileId === null),
      ).toBe(true);
    });
  });

  describe('PATCH /companies/:companyId', () => {
    it('should return 403 for an employer who is not the owner', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/companies/${companyId}`)
        .set('Authorization', `Bearer ${employer2Token}`)
        .field('name', 'Hijacked');

      expect(res.status).toBe(403);
    });

    it('should update the company from multipart fields', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/companies/${companyId}`)
        .set('Authorization', `Bearer ${employer1Token}`)
        .field('name', 'E2E Bistrot')
        .field('companyType', 'Restaurant')
        .field('description', 'E2E description')
        .field('capacity', '')
        .field('mealProvided', 'false')
        .field('dressCode', 'E2E dress code');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          id: companyId,
          name: 'E2E Bistrot',
          companyType: 'Restaurant',
          description: 'E2E description',
          capacity: null,
          mealProvided: false,
          dressCode: 'E2E dress code',
        }),
      );
    });

    it('should reject an unknown company type with 400', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/companies/${companyId}`)
        .set('Authorization', `Bearer ${employer1Token}`)
        .field('companyType', 'Bar');

      expect(res.status).toBe(400);
    });
  });

  describe('POST /review/mission/:missionId', () => {
    it('should create the review and update the company rating', async () => {
      const before = await request(app.getHttpServer())
        .get(`/companies/${companyId}/profile`)
        .set('Authorization', `Bearer ${worker9Token}`);

      const res = await request(app.getHttpServer())
        .post(`/review/mission/${reviewMissionId}`)
        .set('Authorization', `Bearer ${worker9Token}`)
        .send({ rating: 2, comment: 'E2E review', paymentOnTime: true });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ id: expect.any(Number), message: 'Merci pour votre avis' });

      const [review] = await select(`SELECT * FROM review WHERE id = ${res.body.id as number};`);
      expect(review).toEqual(
        expect.objectContaining({
          rating: 2,
          type: 'Worker_to_Company',
          rated_company_id: companyId,
          mission_id: reviewMissionId,
        }),
      );

      const [company] = await select(`SELECT review_count FROM company WHERE id = ${companyId};`);
      expect(company.review_count).toBe(before.body.rating.count + 1);
    });

    it('should return 409 when the mission was already reviewed', async () => {
      const res = await request(app.getHttpServer())
        .post(`/review/mission/${reviewMissionId}`)
        .set('Authorization', `Bearer ${worker9Token}`)
        .send({ rating: 5 });

      expect(res.status).toBe(409);
    });

    it("should return 404 for another worker's mission", async () => {
      const res = await request(app.getHttpServer())
        .post(`/review/mission/${reviewMissionId}`)
        .set('Authorization', `Bearer ${worker1Token}`)
        .send({ rating: 5 });

      expect(res.status).toBe(404);
    });

    it('should reject a rating out of range with 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/review/mission/${reviewMissionId}`)
        .set('Authorization', `Bearer ${worker9Token}`)
        .send({ rating: 6 });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /review/mission/:missionId/payment-report', () => {
    it('should create an open report linked to the mission company', async () => {
      const res = await request(app.getHttpServer())
        .post(`/review/mission/${reviewMissionId}/payment-report`)
        .set('Authorization', `Bearer ${worker9Token}`)
        .send({ reportType: 'LATE_PAYMENT', description: 'E2E report' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: expect.any(Number),
        message: 'Votre signalement a été transmis à Koudmain',
      });

      const [report] = await select(
        `SELECT * FROM payment_report WHERE id = ${res.body.id as number};`,
      );
      expect(report).toEqual(
        expect.objectContaining({
          mission_id: reviewMissionId,
          company_id: companyId,
          report_type: 'LATE_PAYMENT',
          status: 'OPEN',
        }),
      );
    });

    it('should reject an unknown report type with 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/review/mission/${reviewMissionId}/payment-report`)
        .set('Authorization', `Bearer ${worker9Token}`)
        .send({ reportType: 'TOO_LOW' });

      expect(res.status).toBe(400);
    });
  });
});
