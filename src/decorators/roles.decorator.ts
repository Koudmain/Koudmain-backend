import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@/modules/users/models/user.model';

export const ROLES_KEY = 'roles';
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Roles = (...allowedRoles: UserRole[]) => SetMetadata(ROLES_KEY, allowedRoles);
