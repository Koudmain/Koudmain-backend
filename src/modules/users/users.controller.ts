import {
  Controller,
  Patch,
  Get,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { UsersService } from './services/users.service';
import { publicRoute } from '@/decorators/public.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { DriveService } from '../drive/drive.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './models/user.model';

interface RequestWithUser extends ExpressRequest {
  user: {
    sub: number;
    email: string;
  };
}

@Controller('users')
export class UsersController {
  constructor(
    private readonly driveService: DriveService,
    private readonly usersService: UsersService,
  ) {}

  @Patch('me/avatar')
  @UseInterceptors(FileInterceptor('image'))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File, @Request() req: RequestWithUser) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    const userId = req.user.sub;
    const imageUrl = await this.driveService.uploadImage(file);
    await this.usersService.updateProfilePicture(userId, imageUrl);

    return {
      message: 'Photo de profil mise à jour avec succès',
      url: imageUrl,
    };
  }

  @Get('me')
  async getMe(@Request() req: RequestWithUser) {
    const userId = req.user.sub;

    return this.usersService.findOneByIdPublic(userId);
  }

  @Patch('me')
  @UseInterceptors(FileInterceptor('image'))
  async updateMe(
    @Request() req: RequestWithUser,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const userId = req.user.sub;
    const user = await this.usersService.findOneByIdPublic(userId);
    const updates: Partial<User> = { ...updateUserDto };

    if (file) {
      if (user && user.profile_picture_url) {
        await this.driveService.deleteFile(user.profile_picture_url);
      }
      const newImageUrl = await this.driveService.uploadImage(file);
      updates.profile_picture_url = newImageUrl;
    }

    await this.usersService.update(userId, updates);

    return this.usersService.findOneByIdPublic(userId);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @publicRoute()
  @Post('fake')
  createFake() {
    return this.usersService.createFake();
  }
}
