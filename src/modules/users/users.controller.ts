import {
  Controller,
  Patch,
  Get,
  Body,
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { UsersService } from './services/users.service';
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

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly driveService: DriveService,
    private readonly usersService: UsersService,
  ) {}

  @ApiOperation({
    summary: "Mettre à jour l'avatar utilisateur",
    description: 'Upload une nouvelle photo de profil.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Fichier image pour la photo de profil',
        },
      },
      required: ['image'],
    },
  })
  @ApiResponse({ status: 200, description: 'Avatar mis à jour avec succès.' })
  @ApiResponse({ status: 400, description: 'Fichier manquant ou invalide.' })
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

  @ApiOperation({
    summary: 'Obtenir ses propres informations',
    description: "Retourne le profil public de l'utilisateur connecté.",
  })
  @ApiResponse({ status: 200, description: 'Profil récupéré.' })
  @Get('me')
  async getMe(@Request() req: RequestWithUser) {
    const userId = req.user.sub;

    return this.usersService.findOneByIdPublic(userId);
  }

  @ApiOperation({
    summary: 'Mettre à jour son profil',
    description:
      "Modifie les informations de profil de l'utilisateur connecté et optionnellement son avatar.",
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        first_name: { type: 'string', example: 'Jean' },
        last_name: { type: 'string', example: 'Dupont' },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Nouvelle photo de profil (optionnelle)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Profil mis à jour avec succès.' })
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

  @ApiOperation({
    summary: 'Lister tous les utilisateurs',
    description: 'Retourne la liste de tous les utilisateurs.',
  })
  @ApiResponse({ status: 200, description: 'Liste des utilisateurs récupérée.' })
  @Get()
  findAll() {
    return this.usersService.findAll();
  }
}
