import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';

import { S3_CLIENT } from '@/modules/s3/s3.constants';
import { S3Service } from '@/modules/s3/services/s3.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: S3_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): S3Client => {
        const endpoint = configService.get<string>('OVH_S3_ENDPOINT');
        const region = configService.get<string>('OVH_S3_REGION');
        const accessKeyId = configService.get<string>('OVH_S3_ACCESS_KEY');
        const secretAccessKey = configService.get<string>('OVH_S3_SECRET_KEY');

        if (!endpoint) throw new Error('Missing OVH_S3_ENDPOINT');
        if (!region) throw new Error('Missing OVH_S3_REGION');
        if (!accessKeyId) throw new Error('Missing OVH_S3_ACCESS_KEY');
        if (!secretAccessKey) throw new Error('Missing OVH_S3_SECRET_KEY');

        return new S3Client({
          endpoint,
          region,
          credentials: { accessKeyId, secretAccessKey },
          forcePathStyle: configService.get<string>('OVH_S3_FORCE_PATH_STYLE') !== 'false',
        });
      },
    },
    S3Service,
  ],
  exports: [S3Service],
})
export class S3Module {}
