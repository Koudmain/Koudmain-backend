import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { DeviceTokenPlatform } from '@/modules/push/models/device-token.model';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
} from '@/modules/application/models/notification-delivery.model';

export class CreateNotificationDeliveryDto {
  @ApiProperty({ example: 123 })
  @IsInt()
  declare outboxEventId: number;

  @ApiProperty({ example: 42, nullable: true, required: false, type: Number })
  @IsOptional()
  @IsInt()
  declare applicationId?: number | null;

  @ApiProperty({ example: 1 })
  @IsInt()
  declare userId: number;

  @ApiProperty({ enum: DeviceTokenPlatform, example: DeviceTokenPlatform.ANDROID })
  @IsEnum(DeviceTokenPlatform)
  declare platform: DeviceTokenPlatform;

  @ApiProperty({ enum: NotificationChannel, example: NotificationChannel.PUSH })
  @IsEnum(NotificationChannel)
  declare channel: NotificationChannel;

  @ApiProperty({ enum: NotificationDeliveryStatus, example: NotificationDeliveryStatus.SENT })
  @IsEnum(NotificationDeliveryStatus)
  declare status: NotificationDeliveryStatus;

  @ApiProperty({ example: null, nullable: true, required: false, type: String })
  @IsOptional()
  @IsString()
  declare errorMessage?: string | null;
}
