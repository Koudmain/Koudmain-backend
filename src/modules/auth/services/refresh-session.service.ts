import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { RefreshSession } from '../models/refresh-session.model';
import { hash, compare } from 'bcrypt';

@Injectable()
export class RefreshSessionService {
  constructor(@InjectModel(RefreshSession) private refreshSessionModel: typeof RefreshSession) {}

  async createSession(userId: number, refreshToken: string, expiresAt: Date): Promise<RefreshSession> {
    const tokenHash = await hash(refreshToken, 10);
    return this.refreshSessionModel.create({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      revoked_at: null,
    });
  }

  async validateSession(userId: number, refreshToken: string): Promise<RefreshSession | null> {
    const session = await this.refreshSessionModel.findOne({
      where: { user_id: userId, revoked_at: null },
      order: [['created_at', 'DESC']],
      limit: 1,
    });

    if (!session) {
      return null;
    }

    if (new Date() > session.expires_at) {
      return null;
    }

    const isValid = await compare(refreshToken, session.token_hash);
    if (!isValid) {
      return null;
    }

    return session;
  }

  async revokeSession(sessionId: number): Promise<void> {
    await this.refreshSessionModel.update({ revoked_at: new Date() }, { where: { id: sessionId } });
  }
}
