import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '@/modules/auth/controllers/auth.controller';
import { AuthService } from '@/modules/auth/services/auth.service';
import { EmailVerificationService } from '@/modules/auth/services/email-verification.service';
import { UserRole } from '@/modules/users/models/user.model';
import { RegisterDto, WorkerProfileDto } from '@/modules/auth/models/register.model';

const mockAuthService = {
  signIn: jest.fn(),
  register: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
  logoutAll: jest.fn(),
  generateTokensForUser: jest.fn(),
  getUserForVerification: jest.fn(),
};

const mockEmailVerificationService = {
  verifyCode: jest.fn(),
  sendVerificationCode: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: EmailVerificationService, useValue: mockEmailVerificationService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signIn', () => {
    it('should call authService.signIn and return tokens', async () => {
      const mockTokens = { accessToken: 'acc_token', refreshToken: 'ref_token' };
      mockAuthService.signIn.mockResolvedValue(mockTokens);

      const result = await controller.signIn({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(mockAuthService.signIn).toHaveBeenCalledTimes(1);
      expect(mockAuthService.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(result).toEqual(mockTokens);
    });
  });

  describe('signUp', () => {
    it('should pass the full RegisterDto to authService.register and return userId + message', async () => {
      const mockResponse = {
        userId: 1,
        message: 'Un code de vérification a été envoyé à votre adresse email.',
      };
      mockAuthService.register.mockResolvedValue(mockResponse);

      const dto: RegisterDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
        phoneNumber: '0600000000',
        birthDate: '1990-01-01',
        role: UserRole.WORKER,
        workerProfile: {
          skillCategoryIds: [1],
        } as WorkerProfileDto,
      };

      const result = await controller.signUp(dto);

      expect(mockAuthService.register).toHaveBeenCalledTimes(1);
      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('refresh', () => {
    it('should call authService.refresh and return tokens', async () => {
      const mockTokens = { accessToken: 'new_acc', refreshToken: 'new_ref' };
      mockAuthService.refresh.mockResolvedValue(mockTokens);

      const result = await controller.refresh({ refreshToken: 'old_ref' });

      expect(mockAuthService.refresh).toHaveBeenCalledTimes(1);
      expect(mockAuthService.refresh).toHaveBeenCalledWith('old_ref');
      expect(result).toEqual(mockTokens);
    });
  });

  describe('logout', () => {
    it('should call authService.logout and return message', async () => {
      const mockResponse = { message: 'Session revoked successfully' };
      mockAuthService.logout.mockResolvedValue(mockResponse);

      const mockReq = { user: { sub: 123 } } as unknown as Parameters<AuthController['logout']>[0];
      const result = await controller.logout(mockReq);

      expect(mockAuthService.logout).toHaveBeenCalledTimes(1);
      expect(mockAuthService.logout).toHaveBeenCalledWith(123);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('logoutAll', () => {
    it('should call authService.logoutAll and return message', async () => {
      const mockResponse = { message: 'All sessions revoked successfully' };
      mockAuthService.logoutAll.mockResolvedValue(mockResponse);

      const mockReq = {
        user: { sub: 123 },
      } as unknown as Parameters<AuthController['logoutAll']>[0];
      const result = await controller.logoutAll(mockReq);

      expect(mockAuthService.logoutAll).toHaveBeenCalledTimes(1);
      expect(mockAuthService.logoutAll).toHaveBeenCalledWith(123);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getProfile', () => {
    it('should return the user payload from the request', () => {
      const mockPayload = { sub: 123, email: 'test@example.com' };
      const mockReq = { user: mockPayload } as unknown as Parameters<
        AuthController['getProfile']
      >[0];

      const result = controller.getProfile(mockReq);

      expect(result).toEqual(mockPayload);
    });
  });
});
