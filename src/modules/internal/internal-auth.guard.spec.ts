import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { InternalAuthGuard } from './internal-auth.guard';

describe('InternalAuthGuard', () => {
  let guard: InternalAuthGuard;
  let configuredSecret: string | undefined;

  const buildContext = (headers: Record<string, unknown>): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ headers }) }),
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    configuredSecret = 'test-internal-secret';

    const moduleRef = await Test.createTestingModule({
      providers: [
        InternalAuthGuard,
        { provide: ConfigService, useValue: { get: jest.fn(() => configuredSecret) } },
      ],
    }).compile();

    guard = moduleRef.get<InternalAuthGuard>(InternalAuthGuard);
  });

  it('should allow the request when the X-Internal-Secret header matches', () => {
    expect(guard.canActivate(buildContext({ 'x-internal-secret': 'test-internal-secret' }))).toBe(
      true,
    );
  });

  it('should reject the request when the header is missing', () => {
    expect(() => guard.canActivate(buildContext({}))).toThrow(UnauthorizedException);
  });

  it('should reject the request when the header does not match', () => {
    expect(() => guard.canActivate(buildContext({ 'x-internal-secret': 'wrong-secret' }))).toThrow(
      UnauthorizedException,
    );
  });

  it('should reject the request when the header is sent several times', () => {
    expect(() =>
      guard.canActivate(
        buildContext({ 'x-internal-secret': ['test-internal-secret', 'test-internal-secret'] }),
      ),
    ).toThrow(UnauthorizedException);
  });

  it('should reject every request when INTERNAL_SERVICE_SECRET is not configured', () => {
    configuredSecret = undefined;
    expect(() => guard.canActivate(buildContext({ 'x-internal-secret': '' }))).toThrow(
      UnauthorizedException,
    );
    expect(() => guard.canActivate(buildContext({ 'x-internal-secret': 'anything' }))).toThrow(
      UnauthorizedException,
    );
  });
});
