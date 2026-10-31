import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { UserRole } from '@/modules/users/models/user.model';

export interface JwtPayload {
  sub: number;
  email?: string;
  role?: UserRole;
  [key: string]: unknown;
}

type AuthenticatedRequest = Request & { user?: JwtPayload };

export const currentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
