import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../../users/services/users.service';
import { RefreshSessionService } from './refresh-session.service';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private refreshSessionService: RefreshSessionService,
  ) {}

  private async generateTokens(
    payload: Record<string, unknown>,
    userId: number,
  ): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    const accessSecret = process.env.JWT_ACCESS_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    const accessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
    const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret ?? '',
        expiresIn: accessExpiresIn as JwtSignOptions['expiresIn'],
      }),
      this.jwtService.signAsync(
        { ...payload, token_type: 'refresh' },
        {
          secret: refreshSecret ?? '',
          expiresIn: refreshExpiresIn as JwtSignOptions['expiresIn'],
        },
      ),
    ]);

    const expiresAtMs = this.parseExpiresIn(refreshExpiresIn);
    const expiresAt = new Date(Date.now() + expiresAtMs);
    await this.refreshSessionService.createSession(userId, refresh_token, expiresAt);

    return { access_token, refresh_token };
  }

  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/(\d+)([smhd])/);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const [, value, unit] = match;
    const val = parseInt(value, 10);
    const units: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return val * (units[unit] || 1000);
  }

  async signIn(
    email: string,
    pass: string,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new UnauthorizedException();
    }

    const isPasswordValid = await compare(pass, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException();
    }

    const payload = { sub: user.id, email: user.email };
    return this.generateTokens(payload, user.id);
  }

  async refresh(token: string): Promise<{ access_token: string; refresh_token: string }> {
    try {
      const refreshSecret = process.env.JWT_REFRESH_SECRET;
      const payload = await this.jwtService.verifyAsync<{
        sub: number;
        email: string;
        token_type?: string;
      }>(token, { secret: refreshSecret });
      if (payload.token_type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const session = await this.refreshSessionService.validateSession(payload.sub, token);
      if (!session) {
        throw new UnauthorizedException('Refresh session invalid or revoked');
      }

      await this.refreshSessionService.revokeSession(session.id);

      const nextPayload = { sub: payload.sub, email: payload.email };
      return this.generateTokens(nextPayload, payload.sub);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async logout(userId: number): Promise<{ message: string }> {
    await this.refreshSessionService.revokeActiveSessionByUserId(userId);
    return { message: 'Session revoked successfully' };
  }

  async logoutAll(userId: number): Promise<{ message: string }> {
    await this.refreshSessionService.revokeAllSessions(userId);
    return { message: 'All sessions revoked successfully' };
  }

  async register(
    first_name: string,
    last_name: string,
    email: string,
    password: string,
    is_worker_active = false,
    is_employer_active = false,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const existingUser = await this.usersService.findOneByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await hash(password, 10);

    const newUser = await this.usersService.create({
      first_name,
      last_name,
      email,
      password: hashedPassword,
      is_worker_active,
      is_employer_active,
    });

    const payload = {
      sub: newUser.id,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
    };
    return this.generateTokens(payload, newUser.id);
  }
}
