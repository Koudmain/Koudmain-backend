import { Body, Controller, Post, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { DeviceTokenService } from '@/modules/push/services/device-token.service';
import { RegisterDeviceTokenDto } from '@/modules/push/dto/register-device-token.dto';

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
}
