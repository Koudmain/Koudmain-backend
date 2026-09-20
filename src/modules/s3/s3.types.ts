export enum StorageCategory {
  CONTRACT = 'CONTRACT',
  INVOICE = 'INVOICE',
  IDENTITY = 'IDENTITY',
  RIB = 'RIB',
  DIPLOMA = 'DIPLOMA',
  KBIS = 'KBIS',
  OTHER = 'OTHER',
}

export type S3LockMode = 'GOVERNANCE' | 'COMPLIANCE';

export interface StoredObjectRef {
  category: StorageCategory;
  documentId: number;
}

export interface StoredVersion {
  versionId: string;
  isLatest: boolean;
  size: number;
  etag?: string;
  lastModified?: Date;
}

export interface StoredObject extends StoredObjectRef {
  key: string;
  versionId?: string;
  size: number;
  contentType?: string;
  etag?: string;
  lastModified?: Date;
  sealed: boolean;
  retainUntil?: Date;
}

export interface StoredBody {
  body: Buffer;
  contentType?: string;
  versionId?: string;
  etag?: string;
}

export interface PutResult extends StoredObjectRef {
  key: string;
  versionId: string;
  size: number;
  etag?: string;
  checksum: string;
  purgedVersions: number;
}

export interface DownloadUrlOptions {
  expiresIn?: number;
  filename?: string;
  inline?: boolean;
  versionId?: string;
}

export interface SealOptions {
  retentionYears?: number;
  retainUntil?: Date;
  mode?: S3LockMode;
  contentType?: string;
}

export interface SealResult extends StoredObjectRef {
  key: string;
  versionId: string;
  etag?: string;
  checksum?: string;
  mode: S3LockMode;
  retainUntil: Date;
  purgedVersions: number;
  alreadySealed: boolean;
}

export interface RemoveResult {
  deletedVersions: number;
  errors: Array<{ key?: string; versionId?: string; code?: string; message: string }>;
}
