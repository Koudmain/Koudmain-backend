import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '@/modules/users/services/users.service';
import { WorkersService } from '@/modules/workers/services/workers.service';
import { CompaniesService } from '@/modules/companies/services/companies.service';
import { RefreshSessionService } from './refresh-session.service';
import { EmailVerificationService } from '@/modules/auth/services/email-verification.service';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { randomBytes } from 'crypto';
import { google } from 'googleapis';
import { UserRole } from '@/modules/users/models/user.model';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Address } from '@/modules/address/address.model';
import { GeocodingService } from '@/common/utils/geocoding/geocoding.service';
import {
  RegisterDto,
  WorkerProfileDto,
  EmployerProfileDto,
  GoogleRegisterDto,
} from '@/modules/auth/models/register.model';
import { AuthTokenResponse } from '@/modules/auth/controllers/auth.controller';
import { CreateAddressDto } from '@/modules/address/address.dto';
import { Transaction } from 'sequelize';

type AddressGeocodeResult = {
  fullAddress: string;
  latitude: number | null;
  longitude: number | null;
};

type GoogleProfile = {
  email: string;
  firstName: string;
  lastName: string;
};

@Injectable()
export class AuthService {
  private googleClient = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI,
  );

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
  ): Promise<AuthTokenResponse> {
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
      `${addr.streetNumber || ''} ${addr.streetName}, ${addr.zipCode} ${addr.city}, ${country}`.trim();
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

  async signIn(email: string, pass: string): Promise<AuthTokenResponse> {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new UnauthorizedException();
    }

    const isPasswordValid = await compare(pass, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException();
    }

    const payload = {
      sub: user.id,
      email: user.email,
    };
    return this.generateTokens(payload, user.id);
  }

  async refresh(token: string): Promise<AuthTokenResponse> {
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

  async generateTokensForUser(userId: number): Promise<AuthTokenResponse> {
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

    const newUserId = await this.createUser(dto);
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

  async getGoogleAuthUrl(redirect: string): Promise<string> {
    // Only our app may receive the Google ID token; exp:// (Expo Go) is dev only.
    const isAllowed =
      typeof redirect === 'string' &&
      (redirect.startsWith('koudmain://') ||
        (process.env.NODE_ENV !== 'production' && redirect.startsWith('exp://')));
    if (!isAllowed) throw new BadRequestException('Invalid redirect');

    const state = await this.jwtService.signAsync(
      { redirect },
      { secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? '', expiresIn: '10m' },
    );
    return this.googleClient.generateAuthUrl({
      scope: ['openid', 'email', 'profile'],
      state,
      prompt: 'select_account',
    });
  }

  async handleGoogleCallback(state: string, code?: string, error?: string): Promise<string> {
    let redirect: string;
    try {
      ({ redirect } = await this.jwtService.verifyAsync<{ redirect: string }>(state, {
        secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? '',
      }));
    } catch {
      throw new BadRequestException('Invalid state');
    }
    if (error || !code) return `${redirect}?error=cancelled`;

    try {
      const { tokens } = await this.googleClient.getToken(code);
      const idToken = tokens.id_token ?? '';
      const profile = await this.verifyGoogleIdToken(idToken);
      return `${redirect}?${new URLSearchParams({ idToken, ...profile }).toString()}`;
    } catch {
      return `${redirect}?error=failed`;
    }
  }

  async signInWithGoogle(
    idToken: string,
    registration?: GoogleRegisterDto,
  ): Promise<AuthTokenResponse> {
    const { email } = await this.verifyGoogleIdToken(idToken);
    const user = await this.usersService.findOneByEmail(email);
    if (user) {
      if (!user.email_verified_at) await this.usersService.markEmailAsVerified(user.id);
      return this.generateTokens({ sub: user.id, email: user.email }, user.id);
    }
    if (!registration) throw new NotFoundException('GOOGLE_ACCOUNT_NOT_FOUND');

    // password is NOT NULL: Google accounts get a random one nobody knows.
    const userId = await this.createUser({
      ...registration,
      email,
      password: randomBytes(32).toString('hex'),
    });
    await this.usersService.markEmailAsVerified(userId);
    return this.generateTokensForUser(userId);
  }

  private async verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
    // Without an audience, verifyIdToken accepts tokens issued to any Google app.
    const audience = process.env.GOOGLE_OAUTH_CLIENT_ID;
    if (!audience) throw new UnauthorizedException('Google sign-in is not configured');
    try {
      const ticket = await this.googleClient.verifyIdToken({ idToken, audience });
      const payload = ticket.getPayload();
      if (payload?.email && payload.email_verified) {
        return {
          email: payload.email,
          firstName: payload.given_name ?? '',
          lastName: payload.family_name ?? '',
        };
      }
    } catch {
      // invalid, expired or foreign token
    }
    throw new UnauthorizedException('Invalid Google token');
  }

  private async createUser(dto: RegisterDto): Promise<number> {
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
        await this.registerWorker(newUser.id, dto.workerProfile, workerGeo, t);
      }

      if (dto.role === UserRole.EMPLOYER && dto.employerProfile) {
        await this.registerEmployer(newUser.id, dto.employerProfile, employerGeo, t);
      }
    });

    return newUserId;
  }

  private async createAddressRecord(
    addressDto: CreateAddressDto,
    geo: AddressGeocodeResult,
    transaction: Transaction,
  ): Promise<Address> {
    return this.addressModel.create(
      {
        street_number: addressDto.streetNumber,
        street_name: addressDto.streetName,
        zip_code: addressDto.zipCode,
        city: addressDto.city,
        country: addressDto.country || 'France',
        full_address: geo.fullAddress,
        latitude: geo.latitude,
        longitude: geo.longitude,
      },
      { transaction },
    );
  }

  private async registerWorker(
    userId: number,
    profile: WorkerProfileDto,
    geo: AddressGeocodeResult | null,
    transaction: Transaction,
  ): Promise<void> {
    let addressId: number | undefined;
    if (profile.address && geo) {
      const address = await this.createAddressRecord(profile.address, geo, transaction);
      addressId = address.id;
    }

    await this.workersService.create(
      {
        userId,
        skillCategoryIds: profile.skillCategoryIds,
        bio: profile.bio,
        workRadius: profile.workRadius ?? 20,
        ...(addressId !== undefined && { addressId }),
      },
      { transaction },
    );
  }

  private async registerEmployer(
    userId: number,
    profile: EmployerProfileDto,
    geo: AddressGeocodeResult | null,
    transaction: Transaction,
  ): Promise<void> {
    let addressId: number | undefined;
    if (profile.address && geo) {
      const address = await this.createAddressRecord(profile.address, geo, transaction);
      addressId = address.id;
    }

    await this.companiesService.createCompanyWithOwner(
      {
        name: profile.companyName,
        companyType: profile.companyType,
        ownerPosition: profile.ownerPosition,
        desiredJobIds: profile.desiredJobIds,
        ...(addressId !== undefined && { addressId }),
      },
      userId,
      transaction,
    );
  }
}
