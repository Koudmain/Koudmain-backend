import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { Sequelize } from 'sequelize';
import { getConnectionToken, getModelToken } from '@nestjs/sequelize';
import { User } from '../models/user.model';

describe('UsersService', () => {
  let service: UsersService;
  let sequelize: Sequelize;

  const mockUserModel = {
    create: jest.fn(),
    max: jest.fn(),
  };

  const mockSequelize = {
    query: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User),
          useValue: mockUserModel,
        },
        {
          provide: getConnectionToken(),
          useValue: mockSequelize,
        },
      ],
    }).compile();

    service = moduleRef.get<UsersService>(UsersService);
    sequelize = moduleRef.get<Sequelize>(getConnectionToken());

    await sequelize.query('SET CONSTRAINTS ALL DEFERRED;');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
