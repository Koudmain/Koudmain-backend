import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { publicRoute } from '@/decorators/public.decorator';
import { InternalAuthGuard } from '@/modules/internal/internal-auth.guard';
import { DeviceTokenService } from '@/modules/push/services/device-token.service';
import { DeviceTokenPlatform } from '@/modules/push/models/device-token.model';
import { NotificationDeliveryService } from '@/modules/internal/services/notification-delivery.service';
import { GetDeviceTokensQueryDto } from '@/modules/internal/dto/get-device-tokens.query.dto';
import { CreateNotificationDeliveryDto } from '@/modules/internal/dto/create-notification-delivery.dto';

export interface InternalDeviceToken {
  userId: number;
  token: string;
  platform: DeviceTokenPlatform;
}

/**
 * Endpoints réservés aux services internes (Koudmain-worker).
 * Exclus du guard JWT global et protégés par le header X-Internal-Secret.
 */
@ApiTags('Internal')
@ApiHeader({ name: 'X-Internal-Secret', required: true })
@ApiResponse({ status: 401, description: 'Secret interne absent ou invalide.' })
@publicRoute()
@UseGuards(InternalAuthGuard)
@Controller('internal')
export class InternalController {
  constructor(
    private readonly deviceTokenService: DeviceTokenService,
    private readonly notificationDeliveryService: NotificationDeliveryService,
  ) {}

  @Get('device-tokens')
  @ApiOperation({ summary: 'Lister les device tokens des utilisateurs donnés' })
  @ApiResponse({ status: 200, description: 'Device tokens des utilisateurs.' })
  async getDeviceTokens(@Query() query: GetDeviceTokensQueryDto): Promise<InternalDeviceToken[]> {
    const deviceTokens = await this.deviceTokenService.getTokensByUserIds(query.userIds);
    return deviceTokens.map(({ userId, token, platform }) => ({ userId, token, platform }));
  }

  @Delete('device-tokens/:token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un device token invalide' })
  @ApiResponse({ status: 204, description: 'Device token supprimé.' })
  async removeDeviceToken(@Param('token') token: string): Promise<void> {
    await this.deviceTokenService.removeToken(token);
  }

  @Post('notification-deliveries')
  @ApiOperation({ summary: "Enregistrer le résultat de l'envoi d'une notification" })
  @ApiResponse({ status: 201, description: 'Notification delivery enregistrée.' })
  async createNotificationDelivery(
    @Body() dto: CreateNotificationDeliveryDto,
  ): Promise<{ id: number }> {
    const delivery = await this.notificationDeliveryService.create(dto);
    return { id: delivery.id };
  }
}
