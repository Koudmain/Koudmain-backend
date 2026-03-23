import {
  Controller,
  Patch,
  Get,
  Post,
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './services/users.service';
import { Public } from '../../auth/decorators/public.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { DriveService } from '../drive/drive.service';

interface RequestWithUser extends Request {
  user: {
    sub: number;
    email: string;
  }
}

@Controller('users')

export class UsersController {
  constructor(
    private readonly driveService: DriveService,
    private readonly usersService: UsersService,
  ) {}

  @Patch('me/avatar')
  @UseInterceptors(FileInterceptor('image'))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: RequestWithUser
  ) {
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
  async getMe(@Request() req: any) {
    const userId = req.user.sub;

    return this.usersService.findOneByIdPublic(userId);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Public()
  @Post('fake')
  createFake() {
    return this.usersService.createFake();
  }
}