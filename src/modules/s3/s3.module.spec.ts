import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { S3Module } from './s3.module';
import { S3_CLIENT } from './s3.constants';
import { S3Service } from './services/s3.service';

describe('S3Module', () => {
  const baseEnv: Record<string, string> = {
    OVH_S3_ENDPOINT: 'https://s3.gra.io.cloud.ovh.net',
    OVH_S3_REGION: 'gra',
    OVH_S3_ACCESS_KEY: 'access',
    OVH_S3_SECRET_KEY: 'secret',
    OVH_S3_BUCKET: 'koudmain-test',
  };

  const compile = async (env: Record<string, string | undefined>) => {
    const module = await Test.createTestingModule({ imports: [S3Module] })
      .overrideProvider(ConfigService)
      .useValue({ get: (key: string) => env[key] })
      .compile();

    return module;
  };

  beforeEach(() => {
    jest.spyOn(S3Client.prototype, 'send').mockImplementation(async () => ({}));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('doit fournir S3Service et un client OVH configuré', async () => {
    const module = await compile(baseEnv);
    const client = module.get<S3Client>(S3_CLIENT);

    expect(module.get(S3Service)).toBeInstanceOf(S3Service);
    expect(client).toBeInstanceOf(S3Client);
    expect(await client.config.region()).toBe('gra');
    expect(client.config.forcePathStyle).toBe(true);

    await module.close();
  });

  it('doit désactiver le path-style si OVH_S3_FORCE_PATH_STYLE vaut false', async () => {
    const module = await compile({ ...baseEnv, OVH_S3_FORCE_PATH_STYLE: 'false' });

    expect(module.get<S3Client>(S3_CLIENT).config.forcePathStyle).toBe(false);

    await module.close();
  });

  it.each(['OVH_S3_ENDPOINT', 'OVH_S3_REGION', 'OVH_S3_ACCESS_KEY', 'OVH_S3_SECRET_KEY'])(
    'doit refuser de démarrer sans %s',
    async (key) => {
      await expect(compile({ ...baseEnv, [key]: undefined })).rejects.toThrow(`Missing ${key}`);
    },
  );
});
