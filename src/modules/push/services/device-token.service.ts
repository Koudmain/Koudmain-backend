import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { DeviceToken, DeviceTokenPlatform } from '@/modules/push/models/device-token.model';

@Injectable()
export class DeviceTokenService {
  constructor(@InjectModel(DeviceToken) private readonly deviceTokenModel: typeof DeviceToken) {}

  async registerToken(
    userId: number,
    token: string,
    platform: DeviceTokenPlatform,
  ): Promise<DeviceToken> {
    const existing = await this.deviceTokenModel.findOne({ where: { token } });
    if (existing) {
      existing.userId = userId;
      existing.platform = platform;
      existing.updatedAt = new Date();
      await existing.save();
      return existing;
    }

    return this.deviceTokenModel.create({
      userId,
      token,
      platform,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async getTokensByUserIds(userIds: number[]): Promise<DeviceToken[]> {
    if (userIds.length === 0) return [];
    return this.deviceTokenModel.findAll({ where: { userId: userIds } });
  }

  async removeToken(token: string): Promise<void> {
    await this.deviceTokenModel.destroy({ where: { token } });
  }
}
