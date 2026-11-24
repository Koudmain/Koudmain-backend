import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UnregisterDeviceTokenDto {
  @ApiProperty({ example: 'f3b2c1...' })
  @IsString()
  @IsNotEmpty()
  declare token: string;
}
