import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { Global, Module } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { WorkersModule } from '@/modules/workers/workers.module';
import { WorkersService } from '@/modules/workers/services/workers.service';
import { WorkersController } from '@/modules/workers/controllers/workers.controller';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { WorkerJob } from '@/modules/workers/models/worker-job.model';
import { WorkerExperience } from '@/modules/workers/models/worker-experience.model';
import { WorkerFormation } from '@/modules/workers/models/worker-formation.model';
import { WorkerVerification } from '@/modules/workers/models/worker-verification.model';
import { Review } from '@/modules/review/models/review.model';
import { Application } from '@/modules/application/models/application.model';
import { Document } from '@/modules/document/models/document.model';
import { Address } from '@/modules/address/address.model';

jest.mock('@/modules/auth/auth.module', () => {
  @Module({})
  class InlineAuthModule {}

  return {
    AuthModule: InlineAuthModule,
  };
});

@Global()
@Module({ providers: [{ provide: Sequelize, useValue: {} }], exports: [Sequelize] })
class MockSequelizeModule {}

describe('WorkersModule', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    const mockWorkerProfileModel = {};
    const mockWorkerJobModel = {};

    moduleRef = await Test.createTestingModule({
      imports: [WorkersModule, MockSequelizeModule],
    })
      .overrideProvider(getModelToken(WorkerProfile))
      .useValue(mockWorkerProfileModel)
      .overrideProvider(getModelToken(WorkerJob))
      .useValue(mockWorkerJobModel)
      .overrideProvider(getModelToken(WorkerExperience))
      .useValue({})
      .overrideProvider(getModelToken(WorkerFormation))
      .useValue({})
      .overrideProvider(getModelToken(WorkerVerification))
      .useValue({})
      .overrideProvider(getModelToken(Review))
      .useValue({})
      .overrideProvider(getModelToken(Application))
      .useValue({})
      .overrideProvider(getModelToken(Document))
      .useValue({})
      .overrideProvider(getModelToken(Address))
      .useValue({})
      .compile();
  });

  it('le module doit être défini et charger correctement ses composants', () => {
    expect(moduleRef).toBeDefined();

    const service = moduleRef.get<WorkersService>(WorkersService);
    const controller = moduleRef.get<WorkersController>(WorkersController);

    expect(service).toBeInstanceOf(WorkersService);
    expect(controller).toBeInstanceOf(WorkersController);
  });
});
