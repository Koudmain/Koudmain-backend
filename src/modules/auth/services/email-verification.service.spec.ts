import { Test, TestingModule } from '@nestjs/testing';
import { GoneException, HttpException, UnauthorizedException } from '@nestjs/common';
import { EmailVerificationService } from '@/modules/auth/services/email-verification.service';
import { RedisService } from '@/shared/redis/redis.service';
import { MailerService } from '@/modules/mailer/services/mailer.service';
import { UsersService } from '@/modules/users/services/users.service';

const mockRedisService = {
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
};

const mockMailerService = {
  sendVerificationEmail: jest.fn(),
};

const mockUsersService = {
  markEmailAsVerified: jest.fn(),
};

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailVerificationService,
        { provide: RedisService, useValue: mockRedisService },
        { provide: MailerService, useValue: mockMailerService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<EmailVerificationService>(EmailVerificationService);
  });

  describe('sendVerificationCode()', () => {
    it('génère un code à 6 chiffres, le stocke en Redis et envoie l email', async () => {
      mockRedisService.set.mockResolvedValue(undefined);
      mockMailerService.sendVerificationEmail.mockResolvedValue(undefined);

      await service.sendVerificationCode(1, 'test@test.com', 'Jean');

      expect(mockRedisService.set).toHaveBeenCalledWith(
        'email_verification:1',
        expect.stringMatching(/^\d{6}$/),
        900,
      );
      expect(mockMailerService.sendVerificationEmail).toHaveBeenCalledWith(
        'test@test.com',
        'Jean',
        expect.stringMatching(/^\d{6}$/),
      );
    });

    it('lève TooManyRequestsException si le cooldown est actif (enforceRateLimit=true)', async () => {
      mockRedisService.get.mockResolvedValue('1');

      await expect(service.sendVerificationCode(1, 'test@test.com', 'Jean', true)).rejects.toThrow(
        HttpException,
      );

      expect(mockMailerService.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('positionne le cooldown Redis lors d un resend (enforceRateLimit=true)', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue(undefined);
      mockMailerService.sendVerificationEmail.mockResolvedValue(undefined);

      await service.sendVerificationCode(2, 'user@test.com', 'Marie', true);

      expect(mockRedisService.set).toHaveBeenCalledTimes(2);
      expect(mockRedisService.set).toHaveBeenCalledWith('email_verification_cooldown:2', '1', 60);
    });
  });

  describe('verifyCode()', () => {
    it('valide le code correct, met à jour la DB et nettoie Redis', async () => {
      mockRedisService.get.mockResolvedValue('123456');
      mockUsersService.markEmailAsVerified.mockResolvedValue(undefined);
      mockRedisService.del.mockResolvedValue(undefined);

      await expect(service.verifyCode(1, '123456')).resolves.not.toThrow();

      expect(mockUsersService.markEmailAsVerified).toHaveBeenCalledWith(1);
      expect(mockRedisService.del).toHaveBeenCalledWith('email_verification:1');
      expect(mockRedisService.del).toHaveBeenCalledWith('email_verification_cooldown:1');
    });

    it('lève GoneException si le code est expiré (absent de Redis)', async () => {
      mockRedisService.get.mockResolvedValue(null);

      await expect(service.verifyCode(1, '123456')).rejects.toThrow(GoneException);
      expect(mockUsersService.markEmailAsVerified).not.toHaveBeenCalled();
    });

    it('lève UnauthorizedException si le code est invalide', async () => {
      mockRedisService.get.mockResolvedValue('654321');

      await expect(service.verifyCode(1, '000000')).rejects.toThrow(UnauthorizedException);
      expect(mockUsersService.markEmailAsVerified).not.toHaveBeenCalled();
    });
  });
});
