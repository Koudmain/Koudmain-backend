import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';

import { processProfilePicture } from '../../common/utils/image-processor.util';

@Injectable()
export class DriveService {
  private driveClient: drive_v3.Drive;

  constructor(private configService: ConfigService) {
    const clientId = this.configService.get<string>('GOOGLE_DRIVE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_DRIVE_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('GOOGLE_DRIVE_REDIRECT_URI');
    const refreshToken = this.configService.get<string>('GOOGLE_DRIVE_REFRESH_TOKEN');

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    this.driveClient = google.drive({ version: 'v3', auth: oauth2Client });
  }

  async uploadImage(file: Express.Multer.File): Promise<string> {
    try {
      const optimizedBuffer = await processProfilePicture(file.buffer);

      const response = await this.driveClient.files.create({
        requestBody: {
          name: `profile-${Date.now()}.jpg`,
          parents: [this.configService.get<string>('GOOGLE_DRIVE_FOLDER_ID') || ''],
        },
        media: {
          mimeType: 'image/jpeg',
          body: Readable.from(optimizedBuffer),
        },
        fields: 'id',
      } as drive_v3.Params$Resource$Files$Create);

      const fileId = response.data.id;

      if (!fileId) {
        throw new Error("L'ID du fichier n'a pas été généré");
      }
      await this.driveClient.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;

    } catch (error) {
      console.error('Drive Upload Error:', error);
      throw new InternalServerErrorException("Échec du traitement ou de l'envoi de l'image");
    }
  }

  async getOrCreateFolder(folderName: string): Promise<string> {
  const response = await this.driveClient.files.list({
      q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
      fields: 'files(id)',
  });

  if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id!;
  }

  const folder = await this.driveClient.files.create({
      requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
  });

  return folder.data.id!;
  }
}