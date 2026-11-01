import {
  DEFAULT_LOCK_MODE,
  DEFAULT_RETENTION_YEARS,
  DOCUMENT_FOLDERS,
  SEALABLE_CATEGORIES,
  VERSIONED_CATEGORIES,
  retentionDate,
} from './s3.config';
import { StorageCategory } from './s3.types';

describe('s3.config', () => {
  it('doit attribuer un dossier distinct à chaque catégorie', () => {
    const folders = Object.values(StorageCategory).map((category) => DOCUMENT_FOLDERS[category]);

    expect(folders.every(Boolean)).toBe(true);
    expect(new Set(folders).size).toBe(folders.length);
  });

  it('doit réserver l’historique et le scellement aux contrats', () => {
    expect([...VERSIONED_CATEGORIES]).toEqual([StorageCategory.CONTRACT]);
    expect([...SEALABLE_CATEGORIES]).toEqual([StorageCategory.CONTRACT]);
  });

  it('doit sceller en GOVERNANCE pour 10 ans par défaut', () => {
    expect(DEFAULT_LOCK_MODE).toBe('GOVERNANCE');
    expect(DEFAULT_RETENTION_YEARS).toBe(10);
  });

  describe('retentionDate', () => {
    it('doit ajouter le nombre d’années à la date de départ', () => {
      const from = new Date('2026-10-15T12:00:00Z');

      expect(retentionDate(10, from)).toEqual(new Date('2036-10-15T12:00:00Z'));
    });

    it('ne doit pas modifier la date de départ', () => {
      const from = new Date('2026-10-15T12:00:00Z');

      retentionDate(5, from);

      expect(from).toEqual(new Date('2026-10-15T12:00:00Z'));
    });

    it('doit partir de maintenant par défaut', () => {
      const now = new Date();

      expect(retentionDate(1).getFullYear()).toBe(now.getFullYear() + 1);
    });
  });
});
