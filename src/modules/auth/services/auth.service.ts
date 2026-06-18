import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '@/modules/users/services/users.service';
import { WorkersService } from '@/modules/workers/services/workers.service';
import { CompaniesService } from '@/modules/companies/services/companies.service';
import { RefreshSessionService } from './refresh-session.service';
import { EmailVerificationService } from '@/modules/auth/services/email-verification.service';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { UserRole } from '@/modules/users/models/user.model';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Address } from '@/modules/address/address.model';
import { GeocodingService } from '@/common/utils/geocoding/geocoding.service';
import { RegisterDto } from '@/modules/auth/models/register.model';

type AddressGeocodeResult = {
  fullAddress: string;
  latitude: number | null;
  longitude: number | null;
};

type TokenResponse = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private refreshSessionService: RefreshSessionService,
    private workersService: WorkersService,
    private companiesService: CompaniesService,
    private emailVerificationService: EmailVerificationService,
    private geocodingService: GeocodingService,
    private sequelize: Sequelize,
    @InjectModel(Address) private addressModel: typeof Address,
  ) {}

  private async generateTokens(
    payload: Record<string, unknown>,
    userId: number,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const accessSecret = process.env.JWT_ACCESS_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    const accessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
    const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';

    const [accessToken, refreshToken] = await Promise.all([
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
    await this.refreshSessionService.createSession(userId, refreshToken, expiresAt);

    return { accessToken, refreshToken };
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

  private async geocodeAddress(
    addr: NonNullable<RegisterDto['workerProfile']>['address'],
  ): Promise<AddressGeocodeResult> {
    if (!addr) return { fullAddress: '', latitude: null, longitude: null };

    const country = addr.country || 'France';
    const fullAddress =
      `${addr.street_number || ''} ${addr.street_name}, ${addr.zip_code} ${addr.city}, ${country}`.trim();
    try {
      const coords = await this.geocodingService.getCoordsFromAddress(fullAddress);
      return {
        fullAddress,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
      };
    } catch {
      return { fullAddress, latitude: null, longitude: null };
    }
  }

  async signIn(
    email: string,
    pass: string,
    targetApp: 'worker' | 'employer',
  ): Promise<TokenResponse> {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new UnauthorizedException();
    }

    const isPasswordValid = await compare(pass, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException();
    }

    if (targetApp === 'worker' && user.role !== UserRole.WORKER) {
      throw new UnauthorizedException("Vous n'avez pas de profil worker actif");
    }
    if (targetApp === 'employer' && user.role !== UserRole.EMPLOYER) {
      throw new UnauthorizedException("Vous n'avez pas de profil employeur actif");
    }

    const payload = {
      sub: user.id,
      email: user.email,
    };
    return this.generateTokens(payload, user.id);
  }

  async refresh(token: string): Promise<TokenResponse> {
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

  async generateTokensForUser(userId: number): Promise<TokenResponse> {
    const user = await this.usersService.findOneById(userId);
    if (!user) throw new UnauthorizedException('Utilisateur introuvable.');

    const payload = { sub: user.id, email: user.email };
    return this.generateTokens(payload, user.id);
  }

  async getUserForVerification(userId: number) {
    const user = await this.usersService.findOneById(userId);
    if (!user) throw new UnauthorizedException('Utilisateur introuvable.');

    return user;
  }

  async register(dto: RegisterDto): Promise<{ userId: number; message: string }> {
    const existingUser = await this.usersService.findOneByEmail(dto.email);
    if (existingUser) {
      if (!existingUser.email_verified_at) {
        await this.emailVerificationService.sendVerificationCode(
          existingUser.id,
          existingUser.email,
          existingUser.first_name,
        );
        return {
          userId: existingUser.id,
          message: 'Un code de vérification a été renvoyé à votre adresse email.',
        };
      }
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await hash(dto.password, 10);
    const workerGeo =
      dto.role === UserRole.WORKER ? await this.geocodeAddress(dto.workerProfile?.address) : null;
    const employerGeo =
      dto.role === UserRole.EMPLOYER
        ? await this.geocodeAddress(dto.employerProfile?.address)
        : null;

    let newUserId!: number;

    await this.sequelize.transaction(async (t) => {
      const newUser = await this.usersService.create(
        {
          first_name: dto.firstName,
          last_name: dto.lastName,
          email: dto.email,
          password: hashedPassword,
          role: dto.role,
          phone_number: dto.phoneNumber,
          birth_date: dto.birthDate,
        },
        { transaction: t },
      );
      newUserId = newUser.id;

      if (dto.role === UserRole.WORKER && dto.workerProfile) {
        let addressId: number | undefined;
        if (dto.workerProfile.address && workerGeo) {
          const newAddr = await this.addressModel.create(
            {
              ...dto.workerProfile.address,
              country: dto.workerProfile.address.country || 'France',
              full_address: workerGeo.fullAddress,
              latitude: workerGeo.latitude,
              longitude: workerGeo.longitude,
            },
            { transaction: t },
          );
          addressId = newAddr.id;
        }

        await this.workersService.create(
          {
            userId: newUser.id,
            skillCategoryIds: dto.workerProfile.skillCategoryIds,
            bio: dto.workerProfile.bio,
            workRadius: dto.workerProfile.workRadius ?? 20,
            ...(addressId !== undefined && { addressId }),
          },
          { transaction: t },
        );
      }

      if (dto.role === UserRole.EMPLOYER && dto.employerProfile) {
        let addressId: number | undefined;
        if (dto.employerProfile.address && employerGeo) {
          const newAddr = await this.addressModel.create(
            {
              ...dto.employerProfile.address,
              country: dto.employerProfile.address.country || 'France',
              full_address: employerGeo.fullAddress,
              latitude: employerGeo.latitude,
              longitude: employerGeo.longitude,
            },
            { transaction: t },
          );
          addressId = newAddr.id;
        }

        await this.companiesService.createCompanyWithOwner(
          {
            name: dto.employerProfile.companyName,
            establishmentType: dto.employerProfile.establishmentType,
            ownerPosition: dto.employerProfile.ownerPosition,
            desiredTradeIds: dto.employerProfile.desiredTradeIds,
            ...(addressId !== undefined && { addressId }),
          },
          newUser.id,
          t,
        );
      }
    });

    const createdUser = await this.usersService.findOneById(newUserId);
    await this.emailVerificationService.sendVerificationCode(
      newUserId,
      createdUser!.email,
      createdUser!.first_name,
    );

    return {
      userId: newUserId,
      message: 'Un code de vérification a été envoyé à votre adresse email.',
    };
  }
}
