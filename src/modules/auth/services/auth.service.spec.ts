import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '@/modules/users/services/users.service';
import { JwtService } from '@nestjs/jwt';
import { RefreshSessionService } from './refresh-session.service';
import { WorkersService } from '@/modules/workers/services/workers.service';
import { CompaniesService } from '@/modules/companies/services/companies.service';
import { EmailVerificationService } from './email-verification.service';
import { GeocodingService } from '@/common/utils/geocoding/geocoding.service';
import { getModelToken } from '@nestjs/sequelize';
import { Address } from '@/modules/address/address.model';
import { Sequelize } from 'sequelize-typescript';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { UserRole } from '@/modules/users/models/user.model';
import { RegisterDto, WorkerProfileDto, EmployerProfileDto } from '@/modules/auth/dto/register.dto';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findOneByEmail: jest.fn(),
    findOneById: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockRefreshSessionService = {
    createSession: jest.fn(),
    validateSession: jest.fn(),
    revokeSession: jest.fn(),
    revokeActiveSessionByUserId: jest.fn(),
    revokeAllSessions: jest.fn(),
  };

  const mockWorkersService = {
    create: jest.fn(),
  };

  const mockCompaniesService = {
    createCompanyWithOwner: jest.fn(),
  };

  const mockEmailVerificationService = {
    sendVerificationCode: jest.fn(),
  };

  const mockGeocodingService = {
    getCoordsFromAddress: jest.fn(),
  };

  const mockAddressModel = {
    create: jest.fn(),
  };

  /** Simule une transaction Sequelize : exécute le callback et expose commit/rollback */
  const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
  const mockSequelize = {
    transaction: jest.fn().mockImplementation(async (cb: (t: unknown) => Promise<void>) => {
      return cb(mockTransaction);
    }),
  };

  // ─── Setup ───────────────────────────────────────────────────────────────

  beforeEach(async () => {
    // Reset env vars
    process.env.JWT_ACCESS_SECRET = 'access_secret';
    process.env.JWT_REFRESH_SECRET = 'refresh_secret';
    process.env.JWT_ACCESS_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: RefreshSessionService, useValue: mockRefreshSessionService },
        { provide: WorkersService, useValue: mockWorkersService },
        { provide: CompaniesService, useValue: mockCompaniesService },
        { provide: EmailVerificationService, useValue: mockEmailVerificationService },
        { provide: GeocodingService, useValue: mockGeocodingService },
        { provide: Sequelize, useValue: mockSequelize },
        { provide: getModelToken(Address), useValue: mockAddressModel },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signIn', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(null);

      await expect(service.signIn('test@test.com', 'password', 'worker')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is wrong', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue({
        id: 1,
        email: 'test@test.com',
        password: 'hashed',
        role: UserRole.WORKER,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.signIn('test@test.com', 'wrong_pass', 'worker')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if worker profile is inactive', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue({
        id: 1,
        email: 'test@test.com',
        password: 'hashed',
        role: UserRole.EMPLOYER,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.signIn('test@test.com', 'correct_pass', 'worker')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if employer profile is inactive', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue({
        id: 1,
        email: 'test@test.com',
        password: 'hashed',
        role: UserRole.WORKER,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.signIn('test@test.com', 'correct_pass', 'employer')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return tokens if credentials are correct for active worker app', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue({
        id: 1,
        email: 'test@test.com',
        password: 'hashed',
        role: UserRole.WORKER,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      mockJwtService.signAsync
        .mockResolvedValueOnce('access_token_mock')
        .mockResolvedValueOnce('refresh_token_mock');

      const result = await service.signIn('test@test.com', 'correct_pass', 'worker');

      expect(result).toEqual({
        access_token: 'access_token_mock',
        refresh_token: 'refresh_token_mock',
      });
      expect(mockJwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        { sub: 1, email: 'test@test.com', app_context: 'worker' },
        expect.objectContaining({ secret: 'access_secret', expiresIn: '15m' }),
      );
      expect(mockJwtService.signAsync).toHaveBeenNthCalledWith(
        2,
        {
          sub: 1,
          email: 'test@test.com',
          app_context: 'worker',
          token_type: 'refresh',
        },
        expect.objectContaining({ secret: 'refresh_secret', expiresIn: '7d' }),
      );
      expect(mockRefreshSessionService.createSession).toHaveBeenCalledWith(
        1,
        'refresh_token_mock',
        expect.any(Date),
      );
    });
  });

  describe('register', () => {
    const baseWorkerDto: RegisterDto = {
      first_name: 'John',
      last_name: 'Doe',
      email: 'worker@test.com',
      password: 'password123',
      phone_number: '0600000000',
      birth_date: '1990-01-01',
      role: UserRole.WORKER,
      workerProfile: {
        skill_category_id: 1,
        bio: 'Plombier expérimenté',
        work_radius: 30,
      } as WorkerProfileDto,
    };

    const baseEmployerDto: RegisterDto = {
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'employer@test.com',
      password: 'password123',
      phone_number: '0611111111',
      birth_date: '1985-05-05',
      role: UserRole.EMPLOYER,
      employerProfile: {
        company_name: 'Acme Corp',
        owner_position: 'HR', // OwnerPosition enum value
        desired_trade_ids: [1, 2],
      } as EmployerProfileDto,
    };

    it('should throw ConflictException if email already exists', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue({ id: 1 });

      await expect(service.register(baseWorkerDto)).rejects.toThrow(ConflictException);
      expect(mockSequelize.transaction).not.toHaveBeenCalled();
    });

    it('should create WORKER: hash password, run transaction, create user + worker profile, send email', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockUsersService.create.mockResolvedValue({
        id: 2,
        first_name: 'John',
        last_name: 'Doe',
        email: 'worker@test.com',
      });
      mockWorkersService.create.mockResolvedValue({});
      mockUsersService.findOneById.mockResolvedValue({
        id: 2,
        email: 'worker@test.com',
        first_name: 'John',
      });
      mockEmailVerificationService.sendVerificationCode.mockResolvedValue(undefined);

      const result = await service.register(baseWorkerDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockSequelize.transaction).toHaveBeenCalledTimes(1);
      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: 'John',
          email: 'worker@test.com',
          password: 'hashed_password',
          role: UserRole.WORKER,
          phone_number: '0600000000',
          birth_date: '1990-01-01',
        }),
        expect.objectContaining({ transaction: mockTransaction }),
      );
      expect(mockWorkersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 2,
          skillCategoryId: 1,
          workRadius: 30,
        }),
        expect.objectContaining({ transaction: mockTransaction }),
      );
      expect(mockCompaniesService.createCompanyWithOwner).not.toHaveBeenCalled();
      expect(mockEmailVerificationService.sendVerificationCode).toHaveBeenCalledWith(
        2,
        'worker@test.com',
        'John',
      );
      expect(result).toEqual({
        userId: 2,
        message: 'Un code de vérification a été envoyé à votre adresse email.',
      });
    });

    it('should create EMPLOYER: hash password, run transaction, create user + company + trades, send email', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockUsersService.create.mockResolvedValue({
        id: 3,
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'employer@test.com',
      });
      mockCompaniesService.createCompanyWithOwner.mockResolvedValue({ id: 10 });
      mockUsersService.findOneById.mockResolvedValue({
        id: 3,
        email: 'employer@test.com',
        first_name: 'Jane',
      });
      mockEmailVerificationService.sendVerificationCode.mockResolvedValue(undefined);

      await service.register(baseEmployerDto);

      expect(mockWorkersService.create).not.toHaveBeenCalled();
      expect(mockCompaniesService.createCompanyWithOwner).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Acme Corp',
          ownerPosition: 'HR',
          desiredTradeIds: [1, 2],
        }),
        3,
        mockTransaction,
      );
    });

    it('should ROLLBACK and not persist user if workerProfile creation fails', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockUsersService.create.mockResolvedValue({
        id: 99,
        email: 'fail@test.com',
        first_name: 'X',
      });
      mockWorkersService.create.mockRejectedValue(new Error('DB constraint violated'));

      await expect(service.register(baseWorkerDto)).rejects.toThrow('DB constraint violated');
      expect(mockEmailVerificationService.sendVerificationCode).not.toHaveBeenCalled();
    });

    it('should ROLLBACK and not persist user if company creation fails', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockUsersService.create.mockResolvedValue({
        id: 88,
        email: 'fail@test.com',
        first_name: 'Y',
      });
      mockCompaniesService.createCompanyWithOwner.mockRejectedValue(new Error('Company error'));

      await expect(service.register(baseEmployerDto)).rejects.toThrow('Company error');
      expect(mockEmailVerificationService.sendVerificationCode).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('should throw Unauthorized if token verification fails', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('verify error'));

      await expect(service.refresh('bad_token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw Unauthorized if token_type is not refresh', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 1,
        email: 'test@test.com',
        token_type: 'access',
      });

      await expect(service.refresh('token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw Unauthorized if session is invalid or revoked', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 1,
        email: 'test@test.com',
        token_type: 'refresh',
      });
      mockRefreshSessionService.validateSession.mockResolvedValue(null);

      await expect(service.refresh('token')).rejects.toThrow(UnauthorizedException);
    });

    it('should revoke old session and return new tokens', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 1,
        email: 'test@test.com',
        token_type: 'refresh',
      });
      mockRefreshSessionService.validateSession.mockResolvedValue({ id: 99 });

      mockJwtService.signAsync
        .mockResolvedValueOnce('new_access_token')
        .mockResolvedValueOnce('new_refresh_token');

      const result = await service.refresh('valid_token');

      expect(mockRefreshSessionService.revokeSession).toHaveBeenCalledWith(99);
      expect(result).toEqual({
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
      });
    });
  });

  describe('logout', () => {
    it('should revoke active session for user', async () => {
      const result = await service.logout(1);
      expect(mockRefreshSessionService.revokeActiveSessionByUserId).toHaveBeenCalledWith(1);
      expect(result).toEqual({ message: 'Session revoked successfully' });
    });
  });

  describe('logoutAll', () => {
    it('should revoke all sessions for user', async () => {
      const result = await service.logoutAll(1);
      expect(mockRefreshSessionService.revokeAllSessions).toHaveBeenCalledWith(1);
      expect(result).toEqual({ message: 'All sessions revoked successfully' });
    });
  });
});
