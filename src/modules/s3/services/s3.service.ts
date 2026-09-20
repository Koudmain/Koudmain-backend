import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectVersionsCommand,
  ObjectIdentifier,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'crypto';

import { S3_CLIENT } from '@/modules/s3/s3.constants';
import {
  DEFAULT_LOCK_MODE,
  DEFAULT_RETENTION_YEARS,
  DOCUMENT_FOLDERS,
  SEALABLE_CATEGORIES,
  VERSIONED_CATEGORIES,
  retentionDate,
} from '@/modules/s3/s3.config';
import {
  DownloadUrlOptions,
  PutResult,
  RemoveResult,
  SealOptions,
  SealResult,
  StoredBody,
  StoredObject,
  StoredObjectRef,
  StoredVersion,
} from '@/modules/s3/s3.types';

@Injectable()
export class S3Service implements OnModuleInit, OnModuleDestroy {
  private static readonly DELETE_BATCH_SIZE = 1000;

  private static readonly DEFAULT_URL_TTL = 900;

  private static readonly STORAGE_CLASS = 'STANDARD';

  private readonly logger = new Logger(S3Service.name);
  private readonly bucket: string;

  constructor(
    @Inject(S3_CLIENT) private readonly client: S3Client,
    private readonly configService: ConfigService,
  ) {
    const bucket = this.configService.get<string>('OVH_S3_BUCKET');

    if (!bucket) throw new Error('Missing OVH_S3_BUCKET');

    this.bucket = bucket;
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Connecté au bucket OVH Object Storage "${this.bucket}"`);
    } catch (err) {
      this.logger.error('Échec de connexion à OVH Object Storage', err as Error);
    }
  }

  onModuleDestroy(): void {
    this.client.destroy();
  }

  buildKey({ category, documentId }: StoredObjectRef): string {
    const folder = (DOCUMENT_FOLDERS as Record<string, string | undefined>)[category];

    if (!folder) {
      throw new BadRequestException(`Catégorie de document inconnue: "${category}"`);
    }
    if (!Number.isSafeInteger(documentId) || documentId <= 0) {
      throw new BadRequestException(
        `Identifiant de document invalide: "${documentId}" (attendu: entier > 0)`,
      );
    }

    return `${folder}/${documentId}`;
  }

  async put(
    ref: StoredObjectRef,
    body: Buffer | Uint8Array,
    contentType = 'application/octet-stream',
  ): Promise<PutResult> {
    const key = this.buildKey(ref);

    if (SEALABLE_CATEGORIES.has(ref.category)) {
      const current = await this.tryHead(ref);

      if (current?.sealed) {
        throw new ConflictException(
          `Le document ${ref.documentId} est scellé: il ne peut plus être modifié. Verrouillé jusqu'au ${current.retainUntil?.toISOString()}.`,
        );
      }
    }

    const response = await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        StorageClass: S3Service.STORAGE_CLASS,
      }),
    );

    if (!response.VersionId) {
      throw new BadRequestException(
        `Le bucket "${this.bucket}" n'a pas renvoyé de versionId: le versioning doit être actif.`,
      );
    }

    const purged = VERSIONED_CATEGORIES.has(ref.category)
      ? 0
      : (await this.deleteVersions(ref, { keepVersionId: response.VersionId })).deletedVersions;

    return {
      ...ref,
      key,
      versionId: response.VersionId,
      size: body.length,
      etag: response.ETag,
      checksum: S3Service.sha256(body),
      purgedVersions: purged,
    };
  }

  async listVersions(ref: StoredObjectRef): Promise<StoredVersion[]> {
    const key = this.buildKey(ref);
    const versions: StoredVersion[] = [];

    for await (const page of this.versionPages(key)) {
      for (const version of page.Versions ?? []) {
        if (version.Key !== key || !version.VersionId) continue;

        versions.push({
          versionId: version.VersionId,
          isLatest: version.IsLatest ?? false,
          size: version.Size ?? 0,
          etag: version.ETag,
          lastModified: version.LastModified,
        });
      }
    }

    return versions.sort(
      (a, b) => (b.lastModified?.getTime() ?? 0) - (a.lastModified?.getTime() ?? 0),
    );
  }

  async seal(
    ref: StoredObjectRef,
    body: Buffer | Uint8Array,
    options: SealOptions = {},
  ): Promise<SealResult> {
    if (!SEALABLE_CATEGORIES.has(ref.category)) {
      throw new BadRequestException(`Un document "${ref.category}" ne peut pas être scellé.`);
    }

    const key = this.buildKey(ref);
    const mode = options.mode ?? DEFAULT_LOCK_MODE;
    const retainUntil =
      options.retainUntil ?? retentionDate(options.retentionYears ?? DEFAULT_RETENTION_YEARS);

    const current = await this.tryHead(ref);

    if (current?.sealed) {
      return {
        ...ref,
        key,
        versionId: current.versionId ?? '',
        etag: current.etag,
        mode,
        retainUntil: current.retainUntil ?? retainUntil,
        purgedVersions: 0,
        alreadySealed: true,
      };
    }

    const response = await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: options.contentType ?? 'application/pdf',
        StorageClass: S3Service.STORAGE_CLASS,
        ObjectLockMode: mode,
        ObjectLockRetainUntilDate: retainUntil,
        ContentMD5: createHash('md5').update(body).digest('base64'),
      }),
    );

    if (!response.VersionId) {
      throw new BadRequestException(
        `Scellement refusé: le bucket "${this.bucket}" n'a pas renvoyé de versionId.`,
      );
    }

    const purged = await this.deleteVersions(ref, { keepVersionId: response.VersionId });

    return {
      ...ref,
      key,
      versionId: response.VersionId,
      etag: response.ETag,
      checksum: S3Service.sha256(body),
      mode,
      retainUntil,
      purgedVersions: purged.deletedVersions,
      alreadySealed: false,
    };
  }

  async head(ref: StoredObjectRef, versionId?: string): Promise<StoredObject> {
    const key = this.buildKey(ref);

    try {
      const response = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key, VersionId: versionId }),
      );

      const retainUntil = response.ObjectLockRetainUntilDate;

      return {
        ...ref,
        key,
        versionId: response.VersionId,
        size: response.ContentLength ?? 0,
        contentType: response.ContentType,
        etag: response.ETag,
        lastModified: response.LastModified,
        sealed: retainUntil !== undefined && retainUntil.getTime() > Date.now(),
        retainUntil,
      };
    } catch (error) {
      this.rethrow(error, key, versionId);
    }
  }

  async getDownloadUrl(ref: StoredObjectRef, options: DownloadUrlOptions = {}): Promise<string> {
    const key = this.buildKey(ref);

    await this.head(ref, options.versionId);

    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        VersionId: options.versionId,
        ResponseContentDisposition: S3Service.buildContentDisposition(
          options.filename,
          options.inline ?? false,
        ),
      }),
      { expiresIn: options.expiresIn ?? S3Service.DEFAULT_URL_TTL },
    );
  }

  async getBytes(ref: StoredObjectRef, versionId?: string): Promise<StoredBody> {
    const key = this.buildKey(ref);

    try {
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key, VersionId: versionId }),
      );

      if (!response.Body) {
        throw new NotFoundException(`Fichier introuvable: ${this.describe(key, versionId)}`);
      }

      return {
        body: Buffer.from(await response.Body.transformToByteArray()),
        contentType: response.ContentType,
        versionId: response.VersionId,
        etag: response.ETag,
      };
    } catch (error) {
      this.rethrow(error, key, versionId);
    }
  }

  async deleteVersions(
    ref: StoredObjectRef,
    options: { keepVersionId?: string; bypassGovernance?: boolean } = {},
  ): Promise<RemoveResult> {
    const key = this.buildKey(ref);
    const targets: ObjectIdentifier[] = [];

    for await (const page of this.versionPages(key)) {
      for (const entry of [...(page.Versions ?? []), ...(page.DeleteMarkers ?? [])]) {
        if (entry.Key !== key || entry.VersionId === options.keepVersionId) continue;

        targets.push({ Key: key, VersionId: entry.VersionId });
      }
    }

    return this.deleteTargets(targets, options.bypassGovernance);
  }

  private async *versionPages(prefix: string) {
    let keyMarker: string | undefined;
    let versionIdMarker: string | undefined;

    do {
      const response = await this.client.send(
        new ListObjectVersionsCommand({
          Bucket: this.bucket,
          Prefix: prefix,
          KeyMarker: keyMarker,
          VersionIdMarker: versionIdMarker,
        }),
      );

      yield response;

      keyMarker = response.IsTruncated ? response.NextKeyMarker : undefined;
      versionIdMarker = response.IsTruncated ? response.NextVersionIdMarker : undefined;
    } while (keyMarker ?? versionIdMarker);
  }

  private async tryHead(ref: StoredObjectRef): Promise<StoredObject | null> {
    try {
      return await this.head(ref);
    } catch (error) {
      if (error instanceof NotFoundException) return null;
      throw error;
    }
  }

  private async deleteTargets(
    targets: ObjectIdentifier[],
    bypassGovernance?: boolean,
  ): Promise<RemoveResult> {
    let deletedVersions = 0;
    const errors: RemoveResult['errors'] = [];

    for (let i = 0; i < targets.length; i += S3Service.DELETE_BATCH_SIZE) {
      const response = await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: {
            Objects: targets.slice(i, i + S3Service.DELETE_BATCH_SIZE),
            Quiet: false,
          },
          BypassGovernanceRetention: bypassGovernance || undefined,
        }),
      );

      deletedVersions += response.Deleted?.length ?? 0;
      errors.push(
        ...(response.Errors ?? []).map((entry) => ({
          key: entry.Key,
          versionId: entry.VersionId,
          code: entry.Code,
          message: entry.Message ?? 'Erreur inconnue',
        })),
      );
    }

    return { deletedVersions, errors };
  }

  private rethrow(error: unknown, key: string, versionId?: string): never {
    const name = (error as { name?: string })?.name;
    const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata
      ?.httpStatusCode;

    if (
      error instanceof NotFoundException ||
      name === 'NoSuchKey' ||
      name === 'NoSuchVersion' ||
      name === 'NotFound' ||
      status === 404 ||
      (versionId !== undefined && status === 400)
    ) {
      throw new NotFoundException(`Fichier introuvable: ${this.describe(key, versionId)}`);
    }
    throw error;
  }

  private describe(key: string, versionId?: string): string {
    return versionId ? `${key} (version ${versionId})` : key;
  }

  private static sha256(body: Buffer | Uint8Array): string {
    return createHash('sha256').update(body).digest('hex');
  }

  private static buildContentDisposition(filename?: string, inline = false): string | undefined {
    const type = inline ? 'inline' : 'attachment';

    if (!filename) {
      return inline ? 'inline' : undefined;
    }

    const asciiFallback = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');

    return `${type}; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
  }
}
