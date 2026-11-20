import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsInt, IsPositive } from 'class-validator';

export const parseUserIds = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string'
    ? value
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0)
        .map(Number)
    : value;

export class GetDeviceTokensQueryDto {
  @ApiProperty({
    description: 'Identifiants des utilisateurs, séparés par des virgules',
    example: '1,2,3',
    type: String,
  })
  @Transform(parseUserIds)
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  declare userIds: number[];
}
