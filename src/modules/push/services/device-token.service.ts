import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { DeviceToken } from '@/modules/push/models/device-token.model';
import { DeviceTokenPlatform } from '@/modules/push/models/device-token-platform.enum';

@Injectable()
export class DeviceTokenService {
  constructor(@InjectModel(DeviceToken) private readonly deviceTokenModel: typeof DeviceToken) {}

  async registerToken(
    userId: number,
    token: string,
    platform: DeviceTokenPlatform,
  ): Promise<DeviceToken> {
    // Un seul INSERT ... ON CONFLICT (token) : avec findOne puis create, deux requêtes
    // simultanées pour un même nouveau token (lancement + onTokenRefresh, retry) passaient
    // toutes les deux le findOne et la seconde cassait sur UNIQUE(token) en 500.
    // Un token déjà connu change de propriétaire (nouvelle connexion sur le même appareil).
    // createdAt n'est pas fourni : défaut DB à l'insertion, conservé à la mise à jour.
    const [deviceToken] = await this.deviceTokenModel.upsert(
      { userId, token, platform, updatedAt: new Date() },
      { conflictFields: ['token'] },
    );
    return deviceToken;
  }

  async getTokensByUserIds(userIds: number[]): Promise<DeviceToken[]> {
    if (userIds.length === 0) return [];
    return this.deviceTokenModel.findAll({ where: { userId: userIds } });
  }

  async removeToken(token: string): Promise<void> {
    await this.deviceTokenModel.destroy({ where: { token } });
  }

  // Filtré sur userId : un utilisateur ne peut pas désenregistrer l'appareil d'un autre.
  async removeTokenForUser(userId: number, token: string): Promise<void> {
    await this.deviceTokenModel.destroy({ where: { token, userId } });
  }

  async removeAllForUser(userId: number): Promise<void> {
    await this.deviceTokenModel.destroy({ where: { userId } });
  }
}
