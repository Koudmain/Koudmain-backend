import { Test, TestingModule } from '@nestjs/testing';
import { PlanningModule } from './planning.module';
import { getConnectionToken, getModelToken } from '@nestjs/sequelize';
import { Publication } from '../publication/models/publication.model';
import { User } from '../users/models/user.model';
import { PlanningController } from './controllers/planning.controller';
import { PlanningService } from './services/planning.service';

describe('PlanningModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [PlanningModule],
    })
      .overrideProvider(getConnectionToken())
      .useValue({ query: jest.fn() })
      .overrideProvider(getModelToken(Publication))
      .useValue({ create: jest.fn(), findAll: jest.fn() })
      .overrideProvider(getModelToken(User))
      .useValue({ create: jest.fn(), findAll: jest.fn() })
      .compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should have Planning components', () => {
    expect(module.get(PlanningController)).toBeInstanceOf(PlanningController);
    expect(module.get(PlanningService)).toBeInstanceOf(PlanningService);
  });
});
