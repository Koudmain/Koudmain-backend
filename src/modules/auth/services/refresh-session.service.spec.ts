import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { RefreshSessionService } from './refresh-session.service';
import { RefreshSession } from '../models/refresh-session.model';
import { createHash } from 'crypto';

describe('RefreshSessionService', () => {
  let service: RefreshSessionService;

  const mockRefreshSessionModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshSessionService,
        {
          provide: getModelToken(RefreshSession),
          useValue: mockRefreshSessionModel,
        },
      ],
    }).compile();

    service = module.get<RefreshSessionService>(RefreshSessionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSession', () => {
    it('should revoke active session, hash token, and create new session', async () => {
      const expiresAt = new Date();
      mockRefreshSessionModel.update.mockResolvedValue([1]);
      mockRefreshSessionModel.create.mockResolvedValue({ id: 1 });

      await service.createSession(123, 'plain_token', expiresAt);

      // Check revokeActiveSessionByUserId was called via update
      expect(mockRefreshSessionModel.update).toHaveBeenCalledWith(
        { revoked_at: expect.any(Date) as unknown as Date },
        { where: { userId: 123, revoked_at: null } },
      );

      // Check creation with hashed token
      expect(mockRefreshSessionModel.create).toHaveBeenCalledWith({
        userId: 123,
        token_hash: hashToken('plain_token'),
        expires_at: expiresAt,
        revoked_at: null,
      });
    });
  });

  describe('validateSession', () => {
    it('should return null if no session found', async () => {
      mockRefreshSessionModel.findOne.mockResolvedValue(null);

      const result = await service.validateSession(123, 'token');
      expect(result).toBeNull();
    });

    it('should return null if session is expired', async () => {
      const pastDate = new Date(Date.now() - 10000); // Expired
      mockRefreshSessionModel.findOne.mockResolvedValue({
        id: 1,
        expires_at: pastDate,
      });

      const result = await service.validateSession(123, 'token');
      expect(result).toBeNull();
    });

    it('should return null if token hash does not match', async () => {
      const futureDate = new Date(Date.now() + 10000);
      mockRefreshSessionModel.findOne.mockResolvedValue({
        id: 1,
        expires_at: futureDate,
        token_hash: 'wrong_hash',
      });

      const result = await service.validateSession(123, 'token');
      expect(result).toBeNull();
    });

    it('should return session if validation succeeds', async () => {
      const futureDate = new Date(Date.now() + 10000);
      const token = 'valid_token';
      const expectedSession = {
        id: 1,
        expires_at: futureDate,
        token_hash: hashToken(token),
      };

      mockRefreshSessionModel.findOne.mockResolvedValue(expectedSession);

      const result = await service.validateSession(123, token);
      expect(result).toEqual(expectedSession);
    });
  });

  describe('revokeSession', () => {
    it('should update revoked_at for specific session', async () => {
      await service.revokeSession(1);

      expect(mockRefreshSessionModel.update).toHaveBeenCalledWith(
        { revoked_at: expect.any(Date) as unknown as Date },
        { where: { id: 1 } },
      );
    });
  });

  describe('revokeActiveSessionByUserId', () => {
    it('should update revoked_at for active session of user', async () => {
      await service.revokeActiveSessionByUserId(123);

      expect(mockRefreshSessionModel.update).toHaveBeenCalledWith(
        { revoked_at: expect.any(Date) as unknown as Date },
        { where: { userId: 123, revoked_at: null } },
      );
    });
  });

  describe('revokeAllSessions', () => {
    it('should update revoked_at for all sessions of user', async () => {
      await service.revokeAllSessions(123);

      expect(mockRefreshSessionModel.update).toHaveBeenCalledWith(
        { revoked_at: expect.any(Date) as unknown as Date },
        { where: { userId: 123 } },
      );
    });
  });
});
