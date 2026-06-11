import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '@/modules/users/services/users.service';
import { JwtService } from '@nestjs/jwt';
import { RefreshSessionService } from './refresh-session.service';
import { WorkersService } from '@/modules/workers/services/workers.service';
import { CompaniesService } from '@/modules/companies/services/companies.service';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findOneByEmail: jest.fn(),
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
        is_worker_active: true,
        is_employer_active: true,
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
        is_worker_active: false,
        is_employer_active: true,
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
        is_worker_active: true,
        is_employer_active: false,
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
        is_worker_active: true,
        is_employer_active: false,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      mockJwtService.signAsync
        .mockResolvedValueOnce('access_token_mock')
        .mockResolvedValueOnce('refresh_token_mock');

      const result = await service.signIn('test@test.com', 'correct_pass', 'worker');

      expect(result).toEqual({
        accessToken: 'access_token_mock',
        refreshToken: 'refresh_token_mock',
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
    it('should throw ConflictException if email exists', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue({ id: 1 });

      await expect(service.register('John', 'Doe', 'exist@test.com', 'password')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should hash password, create user and return tokens', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockUsersService.create.mockResolvedValue({
        id: 2,
        first_name: 'John',
        last_name: 'Doe',
        email: 'new@test.com',
      });

      mockJwtService.signAsync
        .mockResolvedValueOnce('access_token_mock')
        .mockResolvedValueOnce('refresh_token_mock');

      const result = await service.register('John', 'Doe', 'new@test.com', 'password', true, false);

      expect(bcrypt.hash).toHaveBeenCalledWith('password', 10);
      expect(mockUsersService.create).toHaveBeenCalledWith({
        first_name: 'John',
        last_name: 'Doe',
        email: 'new@test.com',
        password: 'hashed_password',
        is_worker_active: true,
        is_employer_active: false,
      });
      expect(mockWorkersService.create).toHaveBeenCalledWith({ userId: 2 });
      expect(mockCompaniesService.createCompanyWithOwner).not.toHaveBeenCalled();
      expect(result).toEqual({
        accessToken: 'access_token_mock',
        refreshToken: 'refresh_token_mock',
      });
    });

    it('should create company when employer profile is active', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockUsersService.create.mockResolvedValue({
        id: 3,
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'employer@test.com',
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('access_token_mock')
        .mockResolvedValueOnce('refresh_token_mock');

      await service.register(
        'Jane',
        'Smith',
        'employer@test.com',
        'password',
        false,
        true,
        'Acme Corp',
      );

      expect(mockWorkersService.create).not.toHaveBeenCalled();
      expect(mockCompaniesService.createCompanyWithOwner).toHaveBeenCalledWith('Acme Corp', 3);
    });

    it('should create company with default name when employer profile is active and no company name is provided', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockUsersService.create.mockResolvedValue({
        id: 4,
        first_name: 'Paul',
        last_name: 'Martin',
        email: 'employer2@test.com',
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('access_token_mock')
        .mockResolvedValueOnce('refresh_token_mock');

      await service.register('Paul', 'Martin', 'employer2@test.com', 'password', false, true);

      expect(mockCompaniesService.createCompanyWithOwner).toHaveBeenCalledWith(
        'Entreprise de Martin',
        4,
      );
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
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
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
