import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/sequelize';
import { Request } from 'express';
import { AdminProfile } from '@/modules/admin/models/admin-profile.model';

export interface AdminAuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    is_admin_active: boolean;
  };
  adminProfile?: AdminProfile;
}

@Injectable()
export class AdminRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectModel(AdminProfile) private adminProfileModel: typeof AdminProfile,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rolesAutorises = this.reflector.get<string[]>('roles_admin', context.getHandler());

    const request = context.switchToHttp().getRequest<AdminAuthenticatedRequest>();
    const user = request.user;

    if (!user || !user.is_admin_active) {
      throw new ForbiddenException("Accès refusé : Vous n'êtes pas un administrateur actif.");
    }

    const adminProfile = await this.adminProfileModel.findOne({
      where: { user_id: user.id },
    });

    if (!adminProfile) {
      throw new ForbiddenException(
        'Accès refusé : Aucun profil admin trouvé pour cet utilisateur.',
      );
    }

    request.adminProfile = adminProfile;

    if (!rolesAutorises) {
      return true;
    }

    const aLeDroit = rolesAutorises.includes(adminProfile.role);
    if (!aLeDroit) {
      throw new ForbiddenException(
        `Accès interdit : Votre rôle [${adminProfile.role}] ne vous permet pas d'accéder à cette ressource.`,
      );
    }

    return true;
  }
}
