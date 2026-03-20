import { Test, TestingModule } from '@nestjs/testing';
import { DriveService } from './drive.service';
import { ConfigService } from '@nestjs/config';

describe('DriveService', () => {
  let service: DriveService;

  const mockDriveClient = {
    files: {
      create: jest.fn().mockResolvedValue({ data: { id: 'test-file-id' } }),
    },
    permissions: {
      create: jest.fn().mockResolvedValue({}),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriveService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('folder-id') },
        },
      ],
    }).compile();

    service = module.get<DriveService>(DriveService);
    (service as any).driveClient = mockDriveClient;
  });

  it('should upload an image and return an ID', async () => {
      const validImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
      );

      const mockFile = {
      buffer: validImageBuffer,
      mimetype: 'image/png',
      originalname: 'test.png'
      } as Express.Multer.File;

      const result = await service.uploadImage(mockFile);

      expect(result).toContain('test-file-id');
      expect(mockDriveClient.files.create).toHaveBeenCalled();
  });
});
