import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { RefreshSessionService } from './refresh-session.service';
import { UsersService } from '../../users/services/users.service';
import { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
  let service: AuthService;

  const mockUserModel = {
    create: jest.fn(),
    max: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockRefreshSessionService = {
    createSession: jest.fn(),
    validateSession: jest.fn(),
    revokeSession: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUserModel,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: RefreshSessionService,
          useValue: mockRefreshSessionService,
        },
      ],
    }).compile();

    service = moduleRef.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
