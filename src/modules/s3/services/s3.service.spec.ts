import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { HeadBucketCommand } from '@aws-sdk/client-s3';

import { S3_CLIENT } from '../s3.constants';
import { S3Service } from './s3.service';

describe('S3Service', () => {
  let service: S3Service;

  const mockS3Client = {
    send: jest.fn(),
    destroy: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        OVH_S3_BUCKET: 'test-bucket',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3Service,
        { provide: S3_CLIENT, useValue: mockS3Client },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<S3Service>(S3Service);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verifyConnection', () => {
    it('sends a HeadBucketCommand targeting the configured bucket', async () => {
      mockS3Client.send.mockResolvedValue({});

      await service.verifyConnection();

      expect(mockS3Client.send).toHaveBeenCalledTimes(1);
      const [command] = mockS3Client.send.mock.calls[0] as [HeadBucketCommand];
      expect(command).toBeInstanceOf(HeadBucketCommand);
      expect(command.input).toEqual({ Bucket: 'test-bucket' });
    });

    it('propagates the error when the bucket is unreachable', async () => {
      mockS3Client.send.mockRejectedValue(new Error('403 Forbidden'));

      await expect(service.verifyConnection()).rejects.toThrow('403 Forbidden');
    });
  });

  describe('onModuleInit', () => {
    it('logs a success message when the connection succeeds', async () => {
      mockS3Client.send.mockResolvedValue({});
      const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

      await service.onModuleInit();

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('test-bucket'));
    });

    it('logs an error but does not throw when the connection fails', async () => {
      mockS3Client.send.mockRejectedValue(new Error('boom'));
      const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

      await expect(service.onModuleInit()).resolves.toBeUndefined();
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('destroys the underlying S3 client', () => {
      service.onModuleDestroy();

      expect(mockS3Client.destroy).toHaveBeenCalledTimes(1);
    });
  });

  describe('getClient', () => {
    it('returns the injected S3 client', () => {
      expect(service.getClient()).toBe(mockS3Client);
    });
  });
});
