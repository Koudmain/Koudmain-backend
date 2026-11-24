import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '@/modules/users/models/user.model';
import { IS_PUBLIC_KEY } from '@/decorators/public.decorator';
import { ROLES_KEY } from '@/decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const createMockContext = (user?: { sub: number; role?: UserRole }): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should return true if route is public', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return true;
      return undefined;
    });

    const context = createMockContext();
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should return true if no roles are required on the route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const context = createMockContext({ sub: 1, role: UserRole.WORKER });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should return true if user has the required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === ROLES_KEY) return [UserRole.WORKER];
      return undefined;
    });

    const context = createMockContext({ sub: 1, role: UserRole.WORKER });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user has a different role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === ROLES_KEY) return [UserRole.WORKER];
      return undefined;
    });

    const context = createMockContext({ sub: 2, role: UserRole.EMPLOYER });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if user has no role in payload', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === ROLES_KEY) return [UserRole.EMPLOYER];
      return undefined;
    });

    const context = createMockContext({ sub: 1 });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
