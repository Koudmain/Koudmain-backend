import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';

import { S3_CLIENT } from '@/modules/s3/s3.constants';

@Injectable()
export class S3Service implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(S3Service.name);
  private readonly bucket: string;

  constructor(
    @Inject(S3_CLIENT) private readonly client: S3Client,
    private readonly configService: ConfigService,
  ) {
    this.bucket = this.configService.get<string>('OVH_S3_BUCKET') ?? '';
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.verifyConnection();
      this.logger.log(`Connecté au bucket OVH Object Storage "${this.bucket}"`);
    } catch (err) {
      this.logger.error('Échec de connexion à OVH Object Storage', err as Error);
    }
  }

  onModuleDestroy(): void {
    this.client.destroy();
  }

  async verifyConnection(): Promise<void> {
    await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
  }

  getClient(): S3Client {
    return this.client;
  }
}
