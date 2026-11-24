import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';
import { Request } from 'express';

export const INTERNAL_SECRET_HEADER = 'x-internal-secret';
// /internal/* est servi sur le port public : le secret est la seule protection, il doit
// être impossible à deviner (32 caractères = `openssl rand -hex 16` minimum).
export const MIN_INTERNAL_SECRET_LENGTH = 32;

/**
 * Protège les endpoints internes appelés par les services de confiance (Koudmain-worker).
 * Le header X-Internal-Secret doit correspondre à INTERNAL_SERVICE_SECRET.
 * Un secret absent ou trop court refuse toutes les requêtes.
 */
@Injectable()
export class InternalAuthGuard implements CanActivate {
  private readonly logger = new Logger(InternalAuthGuard.name);

  constructor(private readonly configService: ConfigService) {
    if (!this.getUsableSecret()) {
      this.logger.error(
        `INTERNAL_SERVICE_SECRET absent ou plus court que ${MIN_INTERNAL_SECRET_LENGTH} caractères : ` +
          'tous les appels /internal/* seront refusés (générer avec `openssl rand -hex 32`)',
      );
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const expectedSecret = this.getUsableSecret();
    if (!expectedSecret) {
      throw new UnauthorizedException();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const providedSecret = request.headers[INTERNAL_SECRET_HEADER];
    if (typeof providedSecret !== 'string' || !this.secretsMatch(providedSecret, expectedSecret)) {
      throw new UnauthorizedException();
    }

    return true;
  }

  private getUsableSecret(): string | undefined {
    const secret = this.configService.get<string>('INTERNAL_SERVICE_SECRET');
    return secret && secret.length >= MIN_INTERNAL_SECRET_LENGTH ? secret : undefined;
  }

  // Hash both sides so the comparison is constant-time regardless of the secret length
  private secretsMatch(provided: string, expected: string): boolean {
    const providedDigest = createHash('sha256').update(provided).digest();
    const expectedDigest = createHash('sha256').update(expected).digest();
    return timingSafeEqual(providedDigest, expectedDigest);
  }
}
