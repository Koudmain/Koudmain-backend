import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsPositive } from 'class-validator';

export class UnreadCountQueryDto {
  @ApiProperty({ example: 10, type: Number })
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsInt()
  @IsPositive()
  declare publicationId: number;
}
