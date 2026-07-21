import { Test, TestingModule } from '@nestjs/testing';
import { DriveService } from './drive.service';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { processProfilePicture } from '@/common/utils/image-processor.util';

jest.mock('@/common/utils/image-processor.util', () => ({
  processProfilePicture: jest.fn(),
}));
const mockProcessProfilePicture = processProfilePicture as jest.MockedFunction<
  typeof processProfilePicture
>;

describe('DriveService', () => {
  let service: DriveService;

  const mockDriveClient = {
    files: {
      create: jest.fn(),
      list: jest.fn(),
      delete: jest.fn(),
    },
    permissions: {
      create: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        GOOGLE_DRIVE_CLIENT_ID: 'client-id',
        GOOGLE_DRIVE_CLIENT_SECRET: 'secret',
        GOOGLE_DRIVE_REDIRECT_URI: 'uri',
        GOOGLE_DRIVE_REFRESH_TOKEN: 'token',
        GOOGLE_DRIVE_FOLDER_ID: 'folder-id',
      };
      return config[key] || '';
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DriveService, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    service = module.get<DriveService>(DriveService);

    Object.defineProperty(service, 'driveClient', { value: mockDriveClient });

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadImage', () => {
    const mockFile = {
      buffer: Buffer.from('fake-buffer'),
      mimetype: 'image/png',
      originalname: 'test.png',
    } as Express.Multer.File;

    it('should upload an image and return a formatted Google Drive link', async () => {
      mockProcessProfilePicture.mockResolvedValue(Buffer.from('optimized-buffer'));
      mockDriveClient.files.create.mockResolvedValue({ data: { id: 'test-file-id' } });
      mockDriveClient.permissions.create.mockResolvedValue({});

      const result = await service.uploadImage(mockFile);

      expect(result).toBe('https://drive.google.com/thumbnail?id=test-file-id&sz=w1000');
      expect(mockProcessProfilePicture).toHaveBeenCalledWith(mockFile.buffer);
      expect(mockDriveClient.files.create).toHaveBeenCalled();
      expect(mockDriveClient.permissions.create).toHaveBeenCalledWith({
        fileId: 'test-file-id',
        requestBody: { role: 'reader', type: 'anyone' },
      });
    });

    it("should throw InternalServerErrorException if Google Drive doesn't return an ID", async () => {
      mockProcessProfilePicture.mockResolvedValue(Buffer.from('optimized-buffer'));
      mockDriveClient.files.create.mockResolvedValue({ data: { id: null } });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(service.uploadImage(mockFile)).rejects.toThrow(InternalServerErrorException);
      consoleSpy.mockRestore();
    });

    it('should throw InternalServerErrorException if the process crashes', async () => {
      mockProcessProfilePicture.mockRejectedValue(new Error('Sharp crash'));
      jest.spyOn(console, 'error').mockImplementation();

      await expect(service.uploadImage(mockFile)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getOrCreateFolder', () => {
    const folderName = 'MyTestFolder';

    it('should return existing folder ID if found in Google Drive', async () => {
      mockDriveClient.files.list.mockResolvedValue({
        data: { files: [{ id: 'existing-folder-id' }] },
      });

      const result = await service.getOrCreateFolder(folderName);

      expect(result).toBe('existing-folder-id');
      expect(mockDriveClient.files.list).toHaveBeenCalled();
      expect(mockDriveClient.files.create).not.toHaveBeenCalled();
    });

    it('should create a new folder and return its ID if it does not exist', async () => {
      mockDriveClient.files.list.mockResolvedValue({ data: { files: [] } });
      mockDriveClient.files.create.mockResolvedValue({ data: { id: 'new-folder-id' } });

      const result = await service.getOrCreateFolder(folderName);

      expect(result).toBe('new-folder-id');
      expect(mockDriveClient.files.create).toHaveBeenCalledWith({
        requestBody: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
      });
    });
  });

  describe('deleteFile', () => {
    it('should call drive.files.delete with extracted file ID', async () => {
      const url = 'https://drive.google.com/thumbnail?id=abc123xyz&sz=w1000';
      mockDriveClient.files.delete.mockResolvedValue({});
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.deleteFile(url);

      expect(mockDriveClient.files.delete).toHaveBeenCalledWith({ fileId: 'abc123xyz' });
      expect(logSpy).toHaveBeenCalledWith('Fichier Drive supprimé avec succès.');
    });

    it('should warn and early return if no ID is found in the URL', async () => {
      const invalidUrl = 'https://google.com/invalid-url';
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await service.deleteFile(invalidUrl);

      expect(mockDriveClient.files.delete).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
    });

    it('should handle 404 error smoothly when file is already deleted', async () => {
      const url = 'https://drive.google.com/thumbnail?id=missing404&sz=w1000';
      const error404 = { code: 404, message: 'File not found' };
      mockDriveClient.files.delete.mockRejectedValue(error404);

      const infoSpy = jest.spyOn(console, 'info').mockImplementation();

      await service.deleteFile(url);

      expect(mockDriveClient.files.delete).toHaveBeenCalled();
      expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining("n'existe déjà plus sur Drive"));
    });

    it('should log an error if Google Drive delete throws any other error', async () => {
      const url = 'https://drive.google.com/thumbnail?id=crash500&sz=w1000';
      const error500 = { code: 500, message: 'Internal Drive Error' };
      mockDriveClient.files.delete.mockRejectedValue(error500);

      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      await service.deleteFile(url);

      expect(errorSpy).toHaveBeenCalledWith(
        'Erreur lors de la suppression sur Google Drive:',
        'Internal Drive Error',
      );
    });
  });
});
