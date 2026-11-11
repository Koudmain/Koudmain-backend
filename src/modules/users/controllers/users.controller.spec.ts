import { Test, TestingModule } from '@nestjs/testing';
import type { Request as ExpressRequest } from 'express';
import { UsersController } from './users.controller';
import { UsersService } from '@/modules/users/services/users.service';
import { DriveService } from '@/modules/drive/drive.service';
import { BadRequestException } from '@nestjs/common';
import { UpdateUserDto } from '@/modules/users/dto/update-user.dto';
import { Readable } from 'stream';

interface RequestWithUser extends ExpressRequest {
  user: {
    sub: number;
    email: string;
  };
}

describe('UsersController', () => {
  let controller: UsersController;

  const mockUserService = {
    findOneByIdPublic: jest.fn(),
    updateProfilePicture: jest.fn(),
    update: jest.fn(),
  };

  const mockDriveService = {
    uploadImage: jest.fn(),
    deleteFile: jest.fn(),
  };

  const mockFile: Express.Multer.File = {
    fieldname: 'image',
    originalname: 'avatar.png',
    encoding: '7bit',
    mimetype: 'image/png',
    buffer: Buffer.from(''),
    size: 0,
    stream: Readable.from([]),
    destination: '',
    filename: '',
    path: '',
  };

  const mockRequest = {
    user: { sub: 42, email: 'test@example.com' },
  } as unknown as RequestWithUser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUserService },
        { provide: DriveService, useValue: mockDriveService },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadAvatar', () => {
    it('should throw BadRequestException if no file is provided', async () => {
      await expect(
        controller.uploadAvatar(undefined as unknown as Express.Multer.File, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should upload avatar and update profile picture URL', async () => {
      mockDriveService.uploadImage.mockResolvedValue('https://drive.com/avatar.png');

      const result = await controller.uploadAvatar(mockFile, mockRequest);

      expect(mockDriveService.uploadImage).toHaveBeenCalledWith(mockFile);
      expect(mockUserService.updateProfilePicture).toHaveBeenCalledWith(
        42,
        'https://drive.com/avatar.png',
      );
      expect(result).toEqual({
        message: 'Photo de profil mise à jour avec succès',
        url: 'https://drive.com/avatar.png',
      });
    });
  });

  describe('getMe', () => {
    it('should return current user public profile', async () => {
      const publicProfile = { id: 42, email: 'test@example.com', first_name: 'John' };
      mockUserService.findOneByIdPublic.mockResolvedValue(publicProfile);

      const result = await controller.getMe(mockRequest);

      expect(mockUserService.findOneByIdPublic).toHaveBeenCalledWith(42);
      expect(result).toEqual(publicProfile);
    });
  });

  describe('updateMe', () => {
    it('should update user text data and delete old avatar if a new one is provided', async () => {
      mockUserService.findOneByIdPublic.mockResolvedValue({
        id: 42,
        profile_picture_url: 'https://drive.com/old.png',
      });
      mockDriveService.uploadImage.mockResolvedValue('https://drive.com/new.png');
      mockUserService.update.mockResolvedValue([1]);

      const dto: UpdateUserDto = { first_name: 'John' };
      await controller.updateMe(mockRequest, dto, mockFile);

      expect(mockDriveService.deleteFile).toHaveBeenCalledWith('https://drive.com/old.png');
      expect(mockDriveService.uploadImage).toHaveBeenCalledWith(mockFile);
      expect(mockUserService.update).toHaveBeenCalledWith(42, {
        first_name: 'John',
        profile_picture_url: 'https://drive.com/new.png',
      });
    });
  });
});
