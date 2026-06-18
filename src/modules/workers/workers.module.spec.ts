import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { Module } from '@nestjs/common';
import { WorkersModule } from '@/modules/workers/workers.module';
import { WorkersService } from '@/modules/workers/services/workers.service';
import { WorkersController } from '@/modules/workers/controllers/workers.controller';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { WorkerTrade } from '@/modules/workers/models/worker-trade.model';

jest.mock('@/modules/auth/auth.module', () => {
  @Module({})
  class InlineAuthModule {}

  return {
    AuthModule: InlineAuthModule,
  };
});

describe('WorkersModule', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    const mockWorkerProfileModel = {};
    const mockWorkerTradeModel = {};

    moduleRef = await Test.createTestingModule({
      imports: [WorkersModule],
    })
      .overrideProvider(getModelToken(WorkerProfile))
      .useValue(mockWorkerProfileModel)
      .overrideProvider(getModelToken(WorkerTrade))
      .useValue(mockWorkerTradeModel)
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
