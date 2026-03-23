import { Test, TestingModule } from '@nestjs/testing';
import { PublicationController } from './controllers/publication.controller';
import { PublicationService } from './services/publication.service';
import { PublicationModule } from './publication.module';
import { getConnectionToken, getModelToken } from '@nestjs/sequelize';
import { Publication } from './models/publication.model';

describe('PublicationModule', () => {
  let module: TestingModule;

  const mockPublicationService = {
    create: jest.fn(),
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [PublicationModule],
    })
      .overrideProvider(getConnectionToken())
      .useValue({ query: jest.fn() })
      .overrideProvider(getModelToken(Publication))
      .useValue({ create: jest.fn(), findAll: jest.fn() })
      .compile();
  });

  it('should compile the module', async () => {
    expect(module).toBeDefined();
  });

  it('should have Publication components', async () => {
    expect(module.get(PublicationController)).toBeInstanceOf(PublicationController);
    expect(module.get(PublicationService)).toBeInstanceOf(PublicationService);
  });
});
