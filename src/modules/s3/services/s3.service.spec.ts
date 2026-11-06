import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'crypto';
import { S3Service } from './s3.service';
import { S3_CLIENT } from '@/modules/s3/s3.constants';
import { StorageCategory, StoredObjectRef } from '@/modules/s3/s3.types';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

interface CommandInput {
  Bucket?: string;
  Key?: string;
  VersionId?: string;
  ContentType?: string;
  ObjectLockRetainUntilDate?: Date;
  ResponseContentDisposition?: string;
  BypassGovernanceRetention?: boolean;
  Delete?: { Objects: Array<{ Key?: string; VersionId?: string }>; Quiet?: boolean };
  [key: string]: unknown;
}

type CommandHandler = (input: CommandInput) => unknown;

describe('S3Service', () => {
  let service: S3Service;
  let handlers: Record<string, CommandHandler>;

  const bucket = 'koudmain-test';
  const identity: StoredObjectRef = { category: StorageCategory.IDENTITY, documentId: 7 };
  const contract: StoredObjectRef = { category: StorageCategory.CONTRACT, documentId: 42 };
  const body = Buffer.from('%PDF-1.7 contenu');
  const sha256 = createHash('sha256').update(body).digest('hex');
  const future = () => new Date(Date.now() + 365 * 24 * 3600 * 1000);
  const past = () => new Date(Date.now() - 24 * 3600 * 1000);

  const mockClient = {
    send: jest.fn(),
    destroy: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const awsError = (name: string, httpStatusCode?: number) =>
    Object.assign(new Error(name), { name, $metadata: { httpStatusCode } });

  const sent = (command: string) =>
    (mockClient.send.mock.calls as Array<[{ input: CommandInput }]>)
      .map(([cmd]) => cmd)
      .filter((cmd) => cmd.constructor.name === command)
      .map((cmd) => cmd.input);

  const createService = async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3Service,
        { provide: S3_CLIENT, useValue: mockClient },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    return module.get<S3Service>(S3Service);
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockConfigService.get.mockImplementation((key: string) =>
      key === 'OVH_S3_BUCKET' ? bucket : undefined,
    );

    handlers = {
      HeadBucketCommand: () => ({}),
      HeadObjectCommand: () => {
        throw awsError('NotFound', 404);
      },
      PutObjectCommand: () => ({ VersionId: 'v-new', ETag: '"etag"' }),
      ListObjectVersionsCommand: () => ({ Versions: [], DeleteMarkers: [] }),
      DeleteObjectsCommand: (input) => ({ Deleted: input.Delete?.Objects, Errors: [] }),
    };
    mockClient.send.mockImplementation(async (command: { input: CommandInput }) => {
      const handler = handlers[command.constructor.name];

      if (!handler) throw new Error(`Commande inattendue: ${command.constructor.name}`);
      return handler(command.input);
    });

    service = await createService();
  });

  describe('constructor', () => {
    it('doit lever une erreur si OVH_S3_BUCKET est absent', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      await expect(createService()).rejects.toThrow('Missing OVH_S3_BUCKET');
    });
  });

  describe('onModuleInit', () => {
    it('doit vérifier l’accès au bucket configuré', async () => {
      await service.onModuleInit();

      expect(sent('HeadBucketCommand')).toEqual([{ Bucket: bucket }]);
    });

    it('ne doit pas faire échouer le démarrage si le bucket est injoignable', async () => {
      const logError = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      handlers.HeadBucketCommand = () => {
        throw new Error('ECONNREFUSED');
      };

      await expect(service.onModuleInit()).resolves.toBeUndefined();
      expect(logError).toHaveBeenCalled();

      logError.mockRestore();
    });
  });

  describe('onModuleDestroy', () => {
    it('doit fermer le client S3', () => {
      service.onModuleDestroy();

      expect(mockClient.destroy).toHaveBeenCalledTimes(1);
    });
  });

  describe('buildKey', () => {
    it.each([
      [StorageCategory.CONTRACT, 'contracts/1'],
      [StorageCategory.INVOICE, 'invoices/1'],
      [StorageCategory.IDENTITY, 'identity/1'],
      [StorageCategory.RIB, 'rib/1'],
      [StorageCategory.DIPLOMA, 'diplomas/1'],
      [StorageCategory.KBIS, 'kbis/1'],
      [StorageCategory.OTHER, 'others/1'],
    ])('doit ranger %s dans %s', (category, key) => {
      expect(service.buildKey({ category, documentId: 1 })).toBe(key);
    });

    it('doit refuser une catégorie inconnue', () => {
      expect(() =>
        service.buildKey({ category: 'PHOTO' as StorageCategory, documentId: 1 }),
      ).toThrow(BadRequestException);
    });

    it.each([0, -3, 1.5, NaN, Number.MAX_SAFE_INTEGER + 1])(
      'doit refuser l’identifiant %p',
      (documentId) => {
        expect(() => service.buildKey({ category: StorageCategory.RIB, documentId })).toThrow(
          BadRequestException,
        );
      },
    );
  });

  describe('put', () => {
    it('doit stocker le fichier en STANDARD et renvoyer sa version et son empreinte', async () => {
      const result = await service.put(identity, body, 'application/pdf');

      expect(sent('PutObjectCommand')).toEqual([
        {
          Bucket: bucket,
          Key: 'identity/7',
          Body: body,
          ContentType: 'application/pdf',
          StorageClass: 'STANDARD',
        },
      ]);
      expect(result).toEqual({
        ...identity,
        key: 'identity/7',
        versionId: 'v-new',
        size: body.length,
        etag: '"etag"',
        checksum: sha256,
        purgedVersions: 0,
      });
    });

    it('doit utiliser application/octet-stream par défaut', async () => {
      await service.put(identity, body);

      expect(sent('PutObjectCommand')[0].ContentType).toBe('application/octet-stream');
    });

    it('doit purger les anciennes versions d’un document non versionné', async () => {
      handlers.ListObjectVersionsCommand = () => ({
        Versions: [
          { Key: 'identity/7', VersionId: 'v-new' },
          { Key: 'identity/7', VersionId: 'v-old' },
          { Key: 'identity/70', VersionId: 'v-autre-document' },
        ],
        DeleteMarkers: [{ Key: 'identity/7', VersionId: 'v-marker' }],
      });

      const result = await service.put(identity, body);

      expect(sent('ListObjectVersionsCommand')[0]).toMatchObject({
        Bucket: bucket,
        Prefix: 'identity/7',
      });
      expect(sent('DeleteObjectsCommand')[0].Delete?.Objects).toEqual([
        { Key: 'identity/7', VersionId: 'v-old' },
        { Key: 'identity/7', VersionId: 'v-marker' },
      ]);
      expect(result.purgedVersions).toBe(2);
    });

    it('ne doit pas consulter l’état de scellement d’une catégorie non scellable', async () => {
      await service.put(identity, body);

      expect(sent('HeadObjectCommand')).toHaveLength(0);
    });

    it('doit conserver l’historique d’un contrat', async () => {
      handlers.ListObjectVersionsCommand = () => ({
        Versions: [{ Key: 'contracts/42', VersionId: 'v-old' }],
      });

      const result = await service.put(contract, body, 'application/pdf');

      expect(sent('ListObjectVersionsCommand')).toHaveLength(0);
      expect(sent('DeleteObjectsCommand')).toHaveLength(0);
      expect(result.purgedVersions).toBe(0);
    });

    it('doit refuser de modifier un contrat scellé', async () => {
      handlers.HeadObjectCommand = () => ({
        VersionId: 'v-sealed',
        ObjectLockRetainUntilDate: future(),
      });

      await expect(service.put(contract, body)).rejects.toThrow(ConflictException);
      expect(sent('PutObjectCommand')).toHaveLength(0);
    });

    it('doit accepter un contrat dont la rétention est expirée', async () => {
      handlers.HeadObjectCommand = () => ({
        VersionId: 'v-old',
        ObjectLockRetainUntilDate: past(),
      });

      await expect(service.put(contract, body)).resolves.toMatchObject({ versionId: 'v-new' });
    });

    it('doit propager une erreur S3 inattendue lors du contrôle de scellement', async () => {
      const failure = awsError('AccessDenied', 403);
      handlers.HeadObjectCommand = () => {
        throw failure;
      };

      await expect(service.put(contract, body)).rejects.toBe(failure);
      expect(sent('PutObjectCommand')).toHaveLength(0);
    });

    it('doit échouer si le bucket ne renvoie pas de versionId', async () => {
      handlers.PutObjectCommand = () => ({ ETag: '"etag"' });

      await expect(service.put(identity, body)).rejects.toThrow(BadRequestException);
      expect(sent('DeleteObjectsCommand')).toHaveLength(0);
    });
  });

  describe('listVersions', () => {
    it('doit parcourir toutes les pages et trier de la plus récente à la plus ancienne', async () => {
      const pages = [
        {
          IsTruncated: true,
          NextKeyMarker: 'contracts/42',
          NextVersionIdMarker: 'v1',
          Versions: [
            {
              Key: 'contracts/42',
              VersionId: 'v1',
              IsLatest: false,
              Size: 10,
              ETag: '"a"',
              LastModified: new Date('2026-01-01'),
            },
            { Key: 'contracts/420', VersionId: 'v-autre', LastModified: new Date('2026-06-01') },
          ],
        },
        {
          IsTruncated: false,
          Versions: [
            {
              Key: 'contracts/42',
              VersionId: 'v2',
              IsLatest: true,
              Size: 20,
              ETag: '"b"',
              LastModified: new Date('2026-03-01'),
            },
            { Key: 'contracts/42' },
          ],
        },
      ];
      handlers.ListObjectVersionsCommand = () => pages.shift();

      const versions = await service.listVersions(contract);

      expect(sent('ListObjectVersionsCommand')).toEqual([
        {
          Bucket: bucket,
          Prefix: 'contracts/42',
          KeyMarker: undefined,
          VersionIdMarker: undefined,
        },
        {
          Bucket: bucket,
          Prefix: 'contracts/42',
          KeyMarker: 'contracts/42',
          VersionIdMarker: 'v1',
        },
      ]);
      expect(versions).toEqual([
        {
          versionId: 'v2',
          isLatest: true,
          size: 20,
          etag: '"b"',
          lastModified: new Date('2026-03-01'),
        },
        {
          versionId: 'v1',
          isLatest: false,
          size: 10,
          etag: '"a"',
          lastModified: new Date('2026-01-01'),
        },
      ]);
    });

    it('doit appliquer des valeurs par défaut aux champs absents', async () => {
      handlers.ListObjectVersionsCommand = () => ({
        Versions: [{ Key: 'contracts/42', VersionId: 'v1' }],
      });

      await expect(service.listVersions(contract)).resolves.toEqual([
        { versionId: 'v1', isLatest: false, size: 0, etag: undefined, lastModified: undefined },
      ]);
    });

    it('doit renvoyer une liste vide si le fichier n’existe pas', async () => {
      handlers.ListObjectVersionsCommand = () => ({});

      await expect(service.listVersions(contract)).resolves.toEqual([]);
    });
  });

  describe('seal', () => {
    it('doit refuser de sceller une catégorie non scellable', async () => {
      await expect(service.seal(identity, body)).rejects.toThrow(BadRequestException);
      expect(mockClient.send).not.toHaveBeenCalled();
    });

    it('doit sceller en GOVERNANCE pour 10 ans par défaut et purger les autres versions', async () => {
      handlers.ListObjectVersionsCommand = () => ({
        Versions: [
          { Key: 'contracts/42', VersionId: 'v-new' },
          { Key: 'contracts/42', VersionId: 'v-draft' },
        ],
      });
      const before = new Date();

      const result = await service.seal(contract, body);

      const put = sent('PutObjectCommand')[0];
      const expectedYear = before.getFullYear() + 10;

      expect(put).toMatchObject({
        Bucket: bucket,
        Key: 'contracts/42',
        Body: body,
        ContentType: 'application/pdf',
        StorageClass: 'STANDARD',
        ObjectLockMode: 'GOVERNANCE',
        ContentMD5: createHash('md5').update(body).digest('base64'),
      });
      expect((put.ObjectLockRetainUntilDate as Date).getFullYear()).toBe(expectedYear);
      expect(sent('DeleteObjectsCommand')[0].Delete?.Objects).toEqual([
        { Key: 'contracts/42', VersionId: 'v-draft' },
      ]);
      expect(result).toEqual({
        ...contract,
        key: 'contracts/42',
        versionId: 'v-new',
        etag: '"etag"',
        checksum: sha256,
        mode: 'GOVERNANCE',
        retainUntil: put.ObjectLockRetainUntilDate,
        purgedVersions: 1,
        alreadySealed: false,
      });
    });

    it('doit respecter le mode, la date et le type de contenu demandés', async () => {
      const retainUntil = new Date('2040-01-01T00:00:00Z');

      const result = await service.seal(contract, body, {
        mode: 'COMPLIANCE',
        retainUntil,
        retentionYears: 1,
        contentType: 'application/octet-stream',
      });

      expect(sent('PutObjectCommand')[0]).toMatchObject({
        ObjectLockMode: 'COMPLIANCE',
        ObjectLockRetainUntilDate: retainUntil,
        ContentType: 'application/octet-stream',
      });
      expect(result).toMatchObject({ mode: 'COMPLIANCE', retainUntil });
    });

    it('doit calculer la date de rétention à partir de retentionYears', async () => {
      const before = new Date();

      await service.seal(contract, body, { retentionYears: 3 });

      const retainUntil = sent('PutObjectCommand')[0].ObjectLockRetainUntilDate as Date;

      expect(retainUntil.getFullYear()).toBe(before.getFullYear() + 3);
    });

    it('doit être idempotent si le contrat est déjà scellé', async () => {
      const retainUntil = future();
      handlers.HeadObjectCommand = () => ({
        VersionId: 'v-sealed',
        ETag: '"sealed"',
        ObjectLockRetainUntilDate: retainUntil,
      });

      const result = await service.seal(contract, body);

      expect(sent('PutObjectCommand')).toHaveLength(0);
      expect(result).toEqual({
        ...contract,
        key: 'contracts/42',
        versionId: 'v-sealed',
        etag: '"sealed"',
        mode: 'GOVERNANCE',
        retainUntil,
        purgedVersions: 0,
        alreadySealed: true,
      });
    });

    it('doit renvoyer un versionId vide si le scellement existant n’en a pas', async () => {
      handlers.HeadObjectCommand = () => ({ ObjectLockRetainUntilDate: future() });

      await expect(service.seal(contract, body)).resolves.toMatchObject({
        versionId: '',
        alreadySealed: true,
      });
    });

    it('doit échouer si le bucket ne renvoie pas de versionId', async () => {
      handlers.PutObjectCommand = () => ({});

      await expect(service.seal(contract, body)).rejects.toThrow(BadRequestException);
      expect(sent('DeleteObjectsCommand')).toHaveLength(0);
    });
  });

  describe('head', () => {
    it('doit décrire le fichier et son état de scellement', async () => {
      const retainUntil = future();
      const lastModified = new Date('2026-05-01');
      handlers.HeadObjectCommand = () => ({
        VersionId: 'v1',
        ContentLength: 128,
        ContentType: 'application/pdf',
        ETag: '"e"',
        LastModified: lastModified,
        ObjectLockRetainUntilDate: retainUntil,
      });

      const result = await service.head(contract, 'v1');

      expect(sent('HeadObjectCommand')).toEqual([
        { Bucket: bucket, Key: 'contracts/42', VersionId: 'v1' },
      ]);
      expect(result).toEqual({
        ...contract,
        key: 'contracts/42',
        versionId: 'v1',
        size: 128,
        contentType: 'application/pdf',
        etag: '"e"',
        lastModified,
        sealed: true,
        retainUntil,
      });
    });

    it('doit considérer un fichier sans verrou comme non scellé', async () => {
      handlers.HeadObjectCommand = () => ({});

      await expect(service.head(identity)).resolves.toMatchObject({ sealed: false, size: 0 });
    });

    it('doit considérer un verrou expiré comme non scellé', async () => {
      handlers.HeadObjectCommand = () => ({ ObjectLockRetainUntilDate: past() });

      await expect(service.head(contract)).resolves.toMatchObject({ sealed: false });
    });

    it.each([
      ['NoSuchKey', undefined],
      ['NoSuchVersion', undefined],
      ['NotFound', undefined],
      ['UnknownError', 404],
    ])('doit traduire %s (%p) en NotFoundException', async (name, status) => {
      handlers.HeadObjectCommand = () => {
        throw awsError(name, status);
      };

      await expect(service.head(contract)).rejects.toThrow(NotFoundException);
    });

    it('doit traduire un 400 sur une version mal formée en NotFoundException', async () => {
      handlers.HeadObjectCommand = () => {
        throw awsError('BadRequest', 400);
      };

      await expect(service.head(contract, 'pas-une-version')).rejects.toThrow(
        'Fichier introuvable: contracts/42 (version pas-une-version)',
      );
    });

    it('doit propager un 400 sans version demandée', async () => {
      const failure = awsError('BadRequest', 400);
      handlers.HeadObjectCommand = () => {
        throw failure;
      };

      await expect(service.head(contract)).rejects.toBe(failure);
    });

    it('doit propager les autres erreurs', async () => {
      const failure = awsError('AccessDenied', 403);
      handlers.HeadObjectCommand = () => {
        throw failure;
      };

      await expect(service.head(contract)).rejects.toBe(failure);
    });
  });

  describe('getDownloadUrl', () => {
    const mockGetSignedUrl = getSignedUrl as jest.MockedFunction<typeof getSignedUrl>;

    const signedInput = () => (mockGetSignedUrl.mock.calls[0][1] as { input: CommandInput }).input;

    beforeEach(() => {
      handlers.HeadObjectCommand = () => ({ VersionId: 'v1' });
      mockGetSignedUrl.mockResolvedValue('https://s3.example/signed');
    });

    it('doit signer une URL de téléchargement valable 15 minutes par défaut', async () => {
      const url = await service.getDownloadUrl(identity);

      expect(url).toBe('https://s3.example/signed');
      expect(mockGetSignedUrl).toHaveBeenCalledWith(mockClient, expect.anything(), {
        expiresIn: 900,
      });
      expect(signedInput()).toEqual({
        Bucket: bucket,
        Key: 'identity/7',
        VersionId: undefined,
        ResponseContentDisposition: undefined,
      });
    });

    it('doit transmettre la version et la durée demandées', async () => {
      await service.getDownloadUrl(contract, { versionId: 'v1', expiresIn: 60 });

      expect(sent('HeadObjectCommand')[0].VersionId).toBe('v1');
      expect(signedInput().VersionId).toBe('v1');
      expect(mockGetSignedUrl.mock.calls[0][2]).toEqual({ expiresIn: 60 });
    });

    it('doit demander un affichage inline sans nom de fichier', async () => {
      await service.getDownloadUrl(identity, { inline: true });

      expect(signedInput().ResponseContentDisposition).toBe('inline');
    });

    it('doit encoder un nom de fichier accentué avec un repli ASCII', async () => {
      await service.getDownloadUrl(identity, { filename: 'pièce "1".pdf' });

      expect(signedInput().ResponseContentDisposition).toBe(
        `attachment; filename="pi_ce _1_.pdf"; filename*=UTF-8''pi%C3%A8ce%20%221%22.pdf`,
      );
    });

    it('doit combiner inline et nom de fichier', async () => {
      await service.getDownloadUrl(identity, { filename: 'rib.pdf', inline: true });

      expect(signedInput().ResponseContentDisposition).toBe(
        `inline; filename="rib.pdf"; filename*=UTF-8''rib.pdf`,
      );
    });

    it('ne doit rien signer si le fichier est introuvable', async () => {
      handlers.HeadObjectCommand = () => {
        throw awsError('NotFound', 404);
      };

      await expect(service.getDownloadUrl(identity)).rejects.toThrow(NotFoundException);
      expect(mockGetSignedUrl).not.toHaveBeenCalled();
    });
  });

  describe('getBytes', () => {
    it('doit renvoyer le contenu du fichier', async () => {
      handlers.GetObjectCommand = () => ({
        Body: { transformToByteArray: async () => new Uint8Array(body) },
        ContentType: 'application/pdf',
        VersionId: 'v1',
        ETag: '"e"',
      });

      const result = await service.getBytes(contract, 'v1');

      expect(sent('GetObjectCommand')).toEqual([
        { Bucket: bucket, Key: 'contracts/42', VersionId: 'v1' },
      ]);
      expect(result).toEqual({
        body,
        contentType: 'application/pdf',
        versionId: 'v1',
        etag: '"e"',
      });
      expect(Buffer.isBuffer(result.body)).toBe(true);
    });

    it('doit lever NotFoundException si la réponse n’a pas de corps', async () => {
      handlers.GetObjectCommand = () => ({});

      await expect(service.getBytes(contract)).rejects.toThrow('Fichier introuvable: contracts/42');
    });

    it('doit traduire NoSuchVersion en NotFoundException', async () => {
      handlers.GetObjectCommand = () => {
        throw awsError('NoSuchVersion', 404);
      };

      await expect(service.getBytes(contract, 'v-perdue')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteVersions', () => {
    it('ne doit rien supprimer s’il n’y a aucune version', async () => {
      await expect(service.deleteVersions(identity)).resolves.toEqual({
        deletedVersions: 0,
        errors: [],
      });
      expect(sent('DeleteObjectsCommand')).toHaveLength(0);
    });

    it('doit supprimer par lots de 1000 versions', async () => {
      handlers.ListObjectVersionsCommand = () => ({
        Versions: [...Array(1500).keys()].map((i) => ({
          Key: 'identity/7',
          VersionId: `v${i}`,
        })),
      });

      const result = await service.deleteVersions(identity);
      const batches = sent('DeleteObjectsCommand');

      expect(batches).toHaveLength(2);
      expect(batches[0].Delete?.Objects).toHaveLength(1000);
      expect(batches[1].Delete?.Objects).toHaveLength(500);
      expect(batches[0]).toMatchObject({ Bucket: bucket, Delete: { Quiet: false } });
      expect(batches[0].BypassGovernanceRetention).toBeUndefined();
      expect(result.deletedVersions).toBe(1500);
    });

    it('doit contourner la rétention GOVERNANCE si demandé', async () => {
      handlers.ListObjectVersionsCommand = () => ({
        Versions: [{ Key: 'contracts/42', VersionId: 'v1' }],
      });

      await service.deleteVersions(contract, { bypassGovernance: true });

      expect(sent('DeleteObjectsCommand')[0].BypassGovernanceRetention).toBe(true);
    });

    it('doit remonter les suppressions refusées', async () => {
      handlers.ListObjectVersionsCommand = () => ({
        Versions: [
          { Key: 'contracts/42', VersionId: 'v1' },
          { Key: 'contracts/42', VersionId: 'v2' },
        ],
      });
      handlers.DeleteObjectsCommand = () => ({
        Errors: [
          { Key: 'contracts/42', VersionId: 'v1', Code: 'AccessDenied', Message: 'Locked' },
          { Key: 'contracts/42', VersionId: 'v2' },
        ],
      });

      await expect(service.deleteVersions(contract)).resolves.toEqual({
        deletedVersions: 0,
        errors: [
          { key: 'contracts/42', versionId: 'v1', code: 'AccessDenied', message: 'Locked' },
          {
            key: 'contracts/42',
            versionId: 'v2',
            code: undefined,
            message: 'Erreur inconnue',
          },
        ],
      });
    });
  });
});
