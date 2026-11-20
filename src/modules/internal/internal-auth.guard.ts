import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';
import { Request } from 'express';

export const INTERNAL_SECRET_HEADER = 'x-internal-secret';

/**
 * Protège les endpoints internes appelés par les services de confiance (Koudmain-worker).
 * Le header X-Internal-Secret doit correspondre à INTERNAL_SERVICE_SECRET.
 */
@Injectable()
export class InternalAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expectedSecret = this.configService.get<string>('INTERNAL_SERVICE_SECRET');
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

  // Hash both sides so the comparison is constant-time regardless of the secret length
  private secretsMatch(provided: string, expected: string): boolean {
    const providedDigest = createHash('sha256').update(provided).digest();
    const expectedDigest = createHash('sha256').update(expected).digest();
    return timingSafeEqual(providedDigest, expectedDigest);
  }
}
