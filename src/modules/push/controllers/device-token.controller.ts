import { Body, Controller, Delete, HttpCode, Post, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { DeviceTokenService } from '@/modules/push/services/device-token.service';
import { RegisterDeviceTokenDto } from '@/modules/push/dto/register-device-token.dto';
import { UnregisterDeviceTokenDto } from '@/modules/push/dto/unregister-device-token.dto';

interface RequestWithUser extends ExpressRequest {
  user: {
    sub: number;
    email: string;
  };
}

@ApiTags('Push')
@ApiBearerAuth()
@Controller('push/device-tokens')
export class DeviceTokenController {
  constructor(private readonly deviceTokenService: DeviceTokenService) {}

  @Post()
  @ApiOperation({
    summary: 'Enregistrer un device token',
    description:
      "Enregistre le token FCM/APNs de l'appareil courant pour l'utilisateur authentifié. Un utilisateur peut avoir plusieurs tokens (multi-appareils).",
  })
  @ApiResponse({ status: 201, description: 'Device token enregistré.' })
  async register(@Request() req: RequestWithUser, @Body() dto: RegisterDeviceTokenDto) {
    await this.deviceTokenService.registerToken(req.user.sub, dto.token, dto.platform);
    return { success: true };
  }

  @Delete()
  @HttpCode(204)
  @ApiOperation({
    summary: 'Désenregistrer un device token',
    description:
      "À appeler par l'app avant la déconnexion : l'appareil ne reçoit plus les notifications de l'utilisateur. Sans effet si le token n'appartient pas à l'utilisateur authentifié.",
  })
  @ApiResponse({ status: 204, description: 'Device token supprimé (ou déjà absent).' })
  async unregister(
    @Request() req: RequestWithUser,
    @Body() dto: UnregisterDeviceTokenDto,
  ): Promise<void> {
    await this.deviceTokenService.removeTokenForUser(req.user.sub, dto.token);
  }
}
