import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';

const mockAuthService = {
  signIn: jest.fn(),
  register: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
  logoutAll: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
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
        targetApp: 'worker',
      });

      expect(mockAuthService.signIn).toHaveBeenCalledTimes(1);
      expect(mockAuthService.signIn).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
        'worker',
      );
      expect(result).toEqual(mockTokens);
    });
  });

  describe('signUp', () => {
    it('should call authService.register and return tokens', async () => {
      const mockTokens = { accessToken: 'acc_token', refreshToken: 'ref_token' };
      mockAuthService.register.mockResolvedValue(mockTokens);

      const payload = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
        isWorkerActive: true,
        isEmployerActive: false,
      };

      const result = await controller.signUp(payload);

      expect(mockAuthService.register).toHaveBeenCalledTimes(1);
      expect(mockAuthService.register).toHaveBeenCalledWith(
        payload.firstName,
        payload.lastName,
        payload.email,
        payload.password,
        payload.isWorkerActive,
        payload.isEmployerActive,
      );
      expect(result).toEqual(mockTokens);
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

      const mockReq = { user: { sub: 123 } } as unknown as Parameters<
        AuthController['logoutAll']
      >[0];
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
