import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '@/modules/users/services/users.service';
import { JwtService } from '@nestjs/jwt';
import { RefreshSessionService } from './refresh-session.service';
import { WorkersService } from '@/modules/workers/services/workers.service';
import { CompaniesService } from '@/modules/companies/services/companies.service';
import { EmailVerificationService } from '@/modules/auth/services/email-verification.service';
import { GeocodingService } from '@/common/utils/geocoding/geocoding.service';
import { getModelToken } from '@nestjs/sequelize';
import { Address } from '@/modules/address/address.model';
import { Sequelize } from 'sequelize-typescript';
import {
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { UserRole } from '@/modules/users/models/user.model';
import {
  RegisterDto,
  WorkerProfileDto,
  EmployerProfileDto,
  OwnerPosition,
  CompanyType,
  GoogleRegisterDto,
} from '@/modules/auth/models/register.model';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { UniqueConstraintError } from 'sequelize';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

const mockGoogleClient = {
  generateAuthUrl: jest.fn(),
  getToken: jest.fn(),
  verifyIdToken: jest.fn(),
};

jest.mock('googleapis', () => ({
  google: { auth: { OAuth2: jest.fn(() => mockGoogleClient) } },
}));

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findOneByEmail: jest.fn(),
    findOneById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
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

  const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
  const mockSequelize = {
    transaction: jest.fn().mockImplementation(async (cb: (t: unknown) => Promise<void>) => {
      return cb(mockTransaction);
    }),
  };

  beforeEach(async () => {
    // Reset env vars
    process.env.JWT_ACCESS_SECRET = 'access_secret';
    process.env.JWT_REFRESH_SECRET = 'refresh_secret';
    process.env.JWT_ACCESS_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'google_client_id';
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'google_secret';
    process.env.GOOGLE_OAUTH_REDIRECT_URI = 'https://api.test/auth/google/callback';

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

      await expect(service.signIn('test@test.com', 'password')).rejects.toThrow(
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

      await expect(service.signIn('test@test.com', 'wrong_pass')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return tokens if credentials are correct', async () => {
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

      const result = await service.signIn('test@test.com', 'correct_pass');

      expect(result).toEqual({
        accessToken: 'access_token_mock',
        refreshToken: 'refresh_token_mock',
      });
      expect(mockJwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        { sub: 1, email: 'test@test.com' },
        expect.objectContaining({ secret: 'access_secret', expiresIn: '15m' }),
      );
      expect(mockJwtService.signAsync).toHaveBeenNthCalledWith(
        2,
        {
          sub: 1,
          email: 'test@test.com',
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
      firstName: 'John',
      lastName: 'Doe',
      email: 'worker@test.com',
      password: 'password123',
      phoneNumber: '0600000000',
      birthDate: '1990-01-01',
      role: UserRole.WORKER,
      workerProfile: {
        skillCategoryIds: [1],
        bio: 'Plombier expérimenté',
        workRadius: 30,
      } as WorkerProfileDto,
    };

    const baseEmployerDto: RegisterDto = {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'employer@test.com',
      password: 'password123',
      phoneNumber: '0611111111',
      birthDate: '1985-05-05',
      role: UserRole.EMPLOYER,
      employerProfile: {
        companyName: 'Acme Corp',
        companyType: CompanyType.CAFE_BAR,
        ownerPosition: OwnerPosition.HR,
        desiredJobIds: [1, 2],
      } as EmployerProfileDto,
    };

    it('should throw ConflictException if email already exists and is verified', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue({ id: 1, email_verified_at: new Date() });

      await expect(service.register(baseWorkerDto)).rejects.toThrow(ConflictException);
      expect(mockSequelize.transaction).not.toHaveBeenCalled();
    });

    it('should resend verification code and return userId if email exists but is unverified', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue({
        id: 1,
        email_verified_at: null,
        email: 'test@test.com',
        first_name: 'John',
      });

      const result = await service.register(baseWorkerDto);
      expect(mockEmailVerificationService.sendVerificationCode).toHaveBeenCalledWith(
        1,
        'test@test.com',
        'John',
      );
      expect(result).toEqual({
        userId: 1,
        message: 'Un code de vérification a été renvoyé à votre adresse email.',
      });
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
          last_name: 'Doe',
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
          skillCategoryIds: [1],
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

      const result = await service.register(baseEmployerDto);

      expect(mockWorkersService.create).not.toHaveBeenCalled();
      expect(mockCompaniesService.createCompanyWithOwner).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Acme Corp',
          companyType: CompanyType.CAFE_BAR,
          ownerPosition: OwnerPosition.HR,
          desiredJobIds: [1, 2],
        }),
        3,
        mockTransaction,
      );
      expect(result).toEqual({
        userId: 3,
        message: 'Un code de vérification a été envoyé à votre adresse email.',
      });
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

  describe('Google sign-in', () => {
    const redirect = 'exp://192.168.1.10:8083/--/auth/google-callback';
    const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
    const verifier = 'verifier';
    const googlePayload = {
      email: 'john@gmail.com',
      email_verified: true,
      given_name: 'John',
      family_name: 'Doe',
      picture: 'https://lh3.googleusercontent.com/a/abc=s96-c',
      nonce: sha256(verifier),
    };
    const largePicture = 'https://lh3.googleusercontent.com/a/abc=s400-c';
    const nodeEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      mockGoogleClient.verifyIdToken.mockResolvedValue({ getPayload: () => googlePayload });
    });

    afterEach(() => {
      process.env.NODE_ENV = nodeEnv;
    });

    describe('getGoogleAuthUrl', () => {
      it.each(['https://evil.com', 'koudmain', undefined as unknown as string])(
        'should reject the redirect %s',
        async (badRedirect) => {
          await expect(service.getGoogleAuthUrl(badRedirect)).rejects.toThrow(BadRequestException);
          expect(mockGoogleClient.generateAuthUrl).not.toHaveBeenCalled();
        },
      );

      it('should reject exp:// redirects outside development', async () => {
        process.env.NODE_ENV = 'production';
        await expect(service.getGoogleAuthUrl(redirect)).rejects.toThrow(BadRequestException);

        delete process.env.NODE_ENV;
        await expect(service.getGoogleAuthUrl(redirect)).rejects.toThrow(BadRequestException);
      });

      it('should accept koudmain:// redirects in production', async () => {
        process.env.NODE_ENV = 'production';
        mockJwtService.signAsync.mockResolvedValue('signed_state');
        mockGoogleClient.generateAuthUrl.mockReturnValue('https://accounts.google.com/consent');

        await expect(service.getGoogleAuthUrl('koudmain://auth/GoogleCallback')).resolves.toEqual({
          url: 'https://accounts.google.com/consent',
          verifier: expect.any(String),
        });
      });

      it('should refuse to sign the state without the Google client secret', async () => {
        delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;

        await expect(service.getGoogleAuthUrl(redirect)).rejects.toThrow(
          ServiceUnavailableException,
        );
        expect(mockJwtService.signAsync).not.toHaveBeenCalled();
      });

      it('should sign the redirect into the state and return the consent URL with a fresh verifier', async () => {
        mockJwtService.signAsync.mockResolvedValue('signed_state');
        mockGoogleClient.generateAuthUrl.mockReturnValue('https://accounts.google.com/consent');

        const { url, verifier: issued } = await service.getGoogleAuthUrl(redirect);
        const { verifier: next } = await service.getGoogleAuthUrl(redirect);

        expect(mockJwtService.signAsync).toHaveBeenCalledWith(
          { redirect },
          { secret: 'google_secret', expiresIn: '10m' },
        );
        expect(mockGoogleClient.generateAuthUrl).toHaveBeenCalledWith(
          expect.objectContaining({ state: 'signed_state', nonce: sha256(issued) }),
        );
        expect(url).toBe('https://accounts.google.com/consent');
        expect(issued).toMatch(/^[0-9a-f]{64}$/);
        expect(next).not.toBe(issued);
      });
    });

    describe('handleGoogleCallback', () => {
      it('should throw BadRequestException if the state is invalid', async () => {
        mockJwtService.verifyAsync.mockRejectedValue(new Error('invalid signature'));

        await expect(service.handleGoogleCallback('bad_state', 'code')).rejects.toThrow(
          BadRequestException,
        );
        expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('bad_state', {
          secret: 'google_secret',
          ignoreExpiration: true,
        });
      });

      it('should send the user back to the app with error=failed when the state expired', async () => {
        const exp = Math.floor(Date.now() / 1000) - 60;
        mockJwtService.verifyAsync.mockResolvedValue({ redirect, exp });

        await expect(service.handleGoogleCallback('state', 'code')).resolves.toBe(
          `${redirect}?error=failed`,
        );
        expect(mockGoogleClient.getToken).not.toHaveBeenCalled();
      });

      it('should refuse to verify the state without the Google client secret', async () => {
        delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;

        await expect(service.handleGoogleCallback('state', 'code')).rejects.toThrow(
          ServiceUnavailableException,
        );
        expect(mockJwtService.verifyAsync).not.toHaveBeenCalled();
      });

      it('should redirect with error=cancelled when the user refused consent', async () => {
        mockJwtService.verifyAsync.mockResolvedValue({ redirect });

        await expect(
          service.handleGoogleCallback('state', undefined, 'access_denied'),
        ).resolves.toBe(`${redirect}?error=cancelled`);
      });

      it('should redirect with error=failed on any other Google error', async () => {
        mockJwtService.verifyAsync.mockResolvedValue({ redirect });

        await expect(
          service.handleGoogleCallback('state', undefined, 'server_error'),
        ).resolves.toBe(`${redirect}?error=failed`);
      });

      it('should redirect with error=failed when the code exchange fails', async () => {
        mockJwtService.verifyAsync.mockResolvedValue({ redirect });
        mockGoogleClient.getToken.mockRejectedValue(new Error('invalid_grant'));

        await expect(service.handleGoogleCallback('state', 'code')).resolves.toBe(
          `${redirect}?error=failed`,
        );
      });

      it('should redirect with the ID token and the Google profile', async () => {
        mockJwtService.verifyAsync.mockResolvedValue({ redirect });
        mockGoogleClient.getToken.mockResolvedValue({ tokens: { id_token: 'google_id_token' } });

        const url = await service.handleGoogleCallback('state', 'code');

        expect(url).toBe(
          `${redirect}?idToken=google_id_token&email=john%40gmail.com&firstName=John&lastName=Doe`,
        );
      });

      it('should keep the query and fragment the redirect already has', async () => {
        mockJwtService.verifyAsync.mockResolvedValue({ redirect: 'koudmain://auth?from=signup#x' });

        await expect(
          service.handleGoogleCallback('state', undefined, 'access_denied'),
        ).resolves.toBe('koudmain://auth?from=signup&error=cancelled#x');
      });
    });

    describe('signInWithGoogle', () => {
      const registration: GoogleRegisterDto = {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+33612345678',
        role: UserRole.WORKER,
        workerProfile: { skillCategoryIds: [1] } as WorkerProfileDto,
      };

      beforeEach(() => {
        mockJwtService.signAsync.mockResolvedValue('token');
      });

      it('should throw UnauthorizedException if the Google token is invalid', async () => {
        mockGoogleClient.verifyIdToken.mockRejectedValue(new Error('Token used too late'));

        await expect(
          service.signInWithGoogle('google_id_token', verifier, UserRole.WORKER),
        ).rejects.toThrow(UnauthorizedException);
        expect(mockUsersService.findOneByEmail).not.toHaveBeenCalled();
      });

      it.each([
        ['another verifier', 'stolen', googlePayload],
        ['a token without nonce', verifier, { ...googlePayload, nonce: undefined }],
      ])('should throw UnauthorizedException for %s', async (label, sentVerifier, payload) => {
        mockGoogleClient.verifyIdToken.mockResolvedValue({ getPayload: () => payload });

        await expect(
          service.signInWithGoogle('google_id_token', sentVerifier, UserRole.WORKER),
        ).rejects.toThrow(UnauthorizedException);
        expect(mockUsersService.findOneByEmail).not.toHaveBeenCalled();
      });

      it('should throw UnauthorizedException if the Google email is not verified', async () => {
        mockGoogleClient.verifyIdToken.mockResolvedValue({
          getPayload: () => ({ ...googlePayload, email_verified: false }),
        });

        await expect(
          service.signInWithGoogle('google_id_token', verifier, UserRole.WORKER),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should take over an unverified account: verify it, replace its password and revoke its sessions', async () => {
        mockUsersService.findOneByEmail.mockResolvedValue({
          id: 1,
          email: 'john@gmail.com',
          role: UserRole.WORKER,
          email_verified_at: null,
        });
        (bcrypt.hash as jest.Mock).mockResolvedValue('random_hash');

        const result = await service.signInWithGoogle('google_id_token', verifier, UserRole.WORKER);

        expect(mockGoogleClient.verifyIdToken).toHaveBeenCalledWith({
          idToken: 'google_id_token',
          audience: 'google_client_id',
        });
        expect(mockRefreshSessionService.revokeAllSessions).toHaveBeenCalledWith(1);
        expect(mockUsersService.update).toHaveBeenCalledWith(1, {
          email_verified_at: expect.any(Date),
          password: 'random_hash',
          profile_picture_url: largePicture,
        });
        expect(
          mockRefreshSessionService.revokeAllSessions.mock.invocationCallOrder[0],
        ).toBeLessThan(mockRefreshSessionService.createSession.mock.invocationCallOrder[0]);
        expect(result).toEqual({ accessToken: 'token', refreshToken: 'token' });
      });

      it('should leave a verified account and its chosen picture untouched', async () => {
        mockUsersService.findOneByEmail.mockResolvedValue({
          id: 1,
          email: 'john@gmail.com',
          role: UserRole.WORKER,
          email_verified_at: new Date(),
          profile_picture_url: 'https://drive.google.com/thumbnail?id=own',
        });

        const result = await service.signInWithGoogle('google_id_token', verifier, UserRole.WORKER);

        expect(mockUsersService.update).not.toHaveBeenCalled();
        expect(mockRefreshSessionService.revokeAllSessions).not.toHaveBeenCalled();
        expect(result).toEqual({ accessToken: 'token', refreshToken: 'token' });
      });

      it("should refuse another app's account before changing anything", async () => {
        mockUsersService.findOneByEmail.mockResolvedValue({
          id: 1,
          email: 'john@gmail.com',
          role: UserRole.WORKER,
          email_verified_at: null,
        });

        await expect(
          service.signInWithGoogle('google_id_token', verifier, UserRole.EMPLOYER),
        ).rejects.toThrow(new ForbiddenException('WRONG_ROLE'));
        expect(mockUsersService.update).not.toHaveBeenCalled();
        expect(mockRefreshSessionService.revokeAllSessions).not.toHaveBeenCalled();
        expect(mockRefreshSessionService.createSession).not.toHaveBeenCalled();
      });

      it('should throw NotFoundException if no account exists and no registration is given', async () => {
        mockUsersService.findOneByEmail.mockResolvedValue(null);

        await expect(
          service.signInWithGoogle('google_id_token', verifier, UserRole.WORKER),
        ).rejects.toThrow(NotFoundException);
        expect(mockSequelize.transaction).not.toHaveBeenCalled();
      });

      it('should create a verified account in one insert without sending a code', async () => {
        mockUsersService.findOneByEmail.mockResolvedValue(null);
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
        mockUsersService.create.mockResolvedValue({ id: 3 });
        mockWorkersService.create.mockResolvedValue(undefined);

        const result = await service.signInWithGoogle(
          'google_id_token',
          verifier,
          UserRole.WORKER,
          registration,
        );

        expect(mockUsersService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'john@gmail.com',
            password: 'hashed_password',
            first_name: 'John',
            role: UserRole.WORKER,
            email_verified_at: expect.any(Date),
            profile_picture_url: largePicture,
          }),
          { transaction: mockTransaction },
        );
        expect(mockWorkersService.create).toHaveBeenCalled();
        expect(mockUsersService.update).not.toHaveBeenCalled();
        expect(mockEmailVerificationService.sendVerificationCode).not.toHaveBeenCalled();
        expect(mockRefreshSessionService.createSession).toHaveBeenCalledWith(
          3,
          'token',
          expect.any(Date),
        );
        expect(result).toEqual({ accessToken: 'token', refreshToken: 'token' });
      });

      it('should answer 409 when the same email signs up twice at once', async () => {
        mockUsersService.findOneByEmail.mockResolvedValue(null);
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
        mockUsersService.create.mockRejectedValue(new UniqueConstraintError({}));

        await expect(
          service.signInWithGoogle('google_id_token', verifier, UserRole.WORKER, registration),
        ).rejects.toThrow(ConflictException);
        expect(mockRefreshSessionService.createSession).not.toHaveBeenCalled();
      });
    });
  });
});
