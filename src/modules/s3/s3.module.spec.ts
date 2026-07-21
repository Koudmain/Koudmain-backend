import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { S3Client } from '@aws-sdk/client-s3';

import { S3_CLIENT } from './s3.constants';
import { S3Module } from './s3.module';
import { S3Service } from './services/s3.service';

describe('S3Module', () => {
  const validConfig = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        OVH_S3_ENDPOINT: 'https://s3.eu-west-par.io.cloud.ovh.net',
        OVH_S3_REGION: 'eu-west-par',
        OVH_S3_ACCESS_KEY: 'access-key',
        OVH_S3_SECRET_KEY: 'secret-key',
        OVH_S3_BUCKET: 'test-bucket',
      };
      return config[key];
    }),
  };

  it('compiles and provides S3Service with a configured S3 client', async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [S3Module],
    })
      .overrideProvider(ConfigService)
      .useValue(validConfig)
      .compile();

    const service = moduleRef.get<S3Service>(S3Service);
    expect(service).toBeInstanceOf(S3Service);

    const client = moduleRef.get<S3Client>(S3_CLIENT);
    expect(client).toBeInstanceOf(S3Client);
  });

  it('fails to build the S3 client when a required env var is missing', async () => {
    const incompleteConfig = {
      get: jest.fn().mockReturnValue(undefined),
    };

    await expect(
      Test.createTestingModule({ imports: [S3Module] })
        .overrideProvider(ConfigService)
        .useValue(incompleteConfig)
        .compile(),
    ).rejects.toThrow('Missing OVH_S3_ENDPOINT');
  });
});
