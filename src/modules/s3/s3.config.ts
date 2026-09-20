import { S3LockMode, StorageCategory } from '@/modules/s3/s3.types';

export const DOCUMENT_FOLDERS = {
  [StorageCategory.CONTRACT]: 'contracts',
  [StorageCategory.INVOICE]: 'invoices',
  [StorageCategory.IDENTITY]: 'identity',
  [StorageCategory.RIB]: 'rib',
  [StorageCategory.DIPLOMA]: 'diplomas',
  [StorageCategory.KBIS]: 'kbis',
  [StorageCategory.OTHER]: 'others',
} as const satisfies Record<StorageCategory, string>;

export const VERSIONED_CATEGORIES: ReadonlySet<StorageCategory> = new Set([
  StorageCategory.CONTRACT,
]);

export const SEALABLE_CATEGORIES: ReadonlySet<StorageCategory> = new Set([
  StorageCategory.CONTRACT,
]);

export const DEFAULT_LOCK_MODE: S3LockMode = 'GOVERNANCE';
export const DEFAULT_RETENTION_YEARS = 10;

export function retentionDate(years: number, from: Date = new Date()): Date {
  const until = new Date(from);

  until.setFullYear(until.getFullYear() + years);

  return until;
}
