import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { RefreshSession } from '@/modules/auth/models/refresh-session.model';
import { createHash } from 'crypto';

@Injectable()
export class RefreshSessionService {
  constructor(@InjectModel(RefreshSession) private refreshSessionModel: typeof RefreshSession) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async createSession(
    userId: number,
    refreshToken: string,
    expiresAt: Date,
  ): Promise<RefreshSession> {
    await this.revokeActiveSessionByUserId(userId);

    const tokenHash = this.hashToken(refreshToken);
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

    const isValid = this.hashToken(refreshToken) === session.token_hash;
    if (!isValid) {
      return null;
    }

    return session;
  }

  async revokeSession(sessionId: number): Promise<void> {
    await this.refreshSessionModel.update({ revoked_at: new Date() }, { where: { id: sessionId } });
  }

  async revokeActiveSessionByUserId(userId: number): Promise<void> {
    await this.refreshSessionModel.update(
      { revoked_at: new Date() },
      { where: { user_id: userId, revoked_at: null } },
    );
  }

  async revokeAllSessions(userId: number): Promise<void> {
    await this.refreshSessionModel.update(
      { revoked_at: new Date() },
      { where: { user_id: userId } },
    );
  }
}
