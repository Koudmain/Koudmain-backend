import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DeviceTokenPlatform } from '@/modules/push/models/device-token.model';

export class RegisterDeviceTokenDto {
  @ApiProperty({ example: 'f3b2c1...' })
  @IsString()
  @IsNotEmpty()
  declare token: string;

  @ApiProperty({ enum: DeviceTokenPlatform, example: DeviceTokenPlatform.ANDROID })
  @IsEnum(DeviceTokenPlatform)
  declare platform: DeviceTokenPlatform;
}
