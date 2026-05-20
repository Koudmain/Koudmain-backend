import { Test, TestingModule } from '@nestjs/testing';
import { PublicationController } from './controllers/publication.controller';
import { PublicationService } from './services/publication.service';
import { PublicationModule } from './publication.module';
import { getConnectionToken, getModelToken } from '@nestjs/sequelize';
import { Publication } from './models/publication.model';
import { PublicationSkill } from './models/publication-skill.model';

describe('PublicationModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [PublicationModule],
    })
      .overrideProvider(getConnectionToken())
      .useValue({ query: jest.fn() })
      .overrideProvider(getModelToken(Publication))
      .useValue({ create: jest.fn(), findAll: jest.fn() })
      .overrideProvider(getModelToken(PublicationSkill))
      .useValue({ create: jest.fn(), findAll: jest.fn() })
      .compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should have Publication components', () => {
    expect(module.get(PublicationController)).toBeInstanceOf(PublicationController);
    expect(module.get(PublicationService)).toBeInstanceOf(PublicationService);
  });
});
