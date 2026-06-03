import { SetMetadata } from '@nestjs/common';

export const RolesAdmin = (...roles: string[]) => SetMetadata('roles_admin', roles);
