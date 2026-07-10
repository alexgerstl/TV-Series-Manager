import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Database } from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDatabaseConnection } from '../../../src/main/database/connection';
import { runMigrations } from '../../../src/main/database/migrationRunner';
import { SettingsRepository } from '../../../src/main/database/repositories/SettingsRepository';
import type { ISafeStorage } from '../../../src/main/settings/ISafeStorage';
import { SettingsService } from '../../../src/main/settings/SettingsService';

const MIGRATIONS_DIR = fileURLToPath(
  new URL('../../../src/main/database/migrations', import.meta.url),
);

/**
 * A reversible fake `safeStorage`. Deliberately transforms the plaintext
 * (reverses it and adds a marker prefix) so tests can assert that what
 * lands in the DB is neither the plaintext nor a no-op passthrough — a
 * fake that just echoed the input back would let a broken (non-encrypting)
 * SettingsService pass the "not plaintext" assertion by accident.
 */
class FakeSafeStorage implements ISafeStorage {
  private available = true;

  setAvailable(available: boolean): void {
    this.available = available;
  }

  isEncryptionAvailable(): boolean {
    return this.available;
  }

  encryptString(plainText: string): Buffer {
    const reversed = plainText.split('').reverse().join('');
    return Buffer.from(`FAKEENC:${reversed}`, 'utf-8');
  }

  decryptString(encrypted: Buffer): string {
    const text = encrypted.toString('utf-8');
    const prefix = 'FAKEENC:';
    if (!text.startsWith(prefix)) {
      throw new Error('FakeSafeStorage.decryptString: input was not produced by encryptString');
    }
    return text.slice(prefix.length).split('').reverse().join('');
  }
}

describe('SettingsService', () => {
  let tempDir: string;
  let db: Database;
  let repository: SettingsRepository;
  let safeStorage: FakeSafeStorage;
  let service: SettingsService;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'tvsm-settings-service-test-'));
    db = createDatabaseConnection(join(tempDir, 'test.sqlite'));
    runMigrations(db, MIGRATIONS_DIR);

    repository = new SettingsRepository(db);
    safeStorage = new FakeSafeStorage();
    service = new SettingsService(repository, safeStorage);
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('non-secret settings', () => {
    it('returns null for a key that has never been set', () => {
      expect(service.get('incomingPath')).toBeNull();
    });

    it('round-trips a value through set/get as plaintext', () => {
      service.set('incomingPath', 'C:\\Users\\alexg\\Incoming');
      expect(service.get('incomingPath')).toBe('C:\\Users\\alexg\\Incoming');

      // Confirms "as plaintext" against the raw DB row, not just via the
      // service's own get() (which could theoretically mask a bug).
      const raw = db.prepare('SELECT value FROM Settings WHERE key = ?').get('incomingPath') as {
        value: string;
      };
      expect(raw.value).toBe('C:\\Users\\alexg\\Incoming');
    });

    it('overwrites an existing value on a second set', () => {
      service.set('theme', 'light');
      service.set('theme', 'dark');
      expect(service.get('theme')).toBe('dark');
    });
  });

  describe('NAS password (encrypted-at-rest)', () => {
    it('round-trips through setNasPassword/getNasPassword', () => {
      service.setNasPassword('correct horse battery staple');
      expect(service.getNasPassword()).toBe('correct horse battery staple');
    });

    it('returns null when no NAS password has been set', () => {
      expect(service.getNasPassword()).toBeNull();
    });

    it('never stores the NAS password as plaintext in the database', () => {
      const plaintext = 'correct horse battery staple';
      service.setNasPassword(plaintext);

      const raw = db.prepare('SELECT value FROM Settings WHERE key = ?').get('nasPassword') as {
        value: string;
      };

      expect(raw.value).not.toBe(plaintext);
      expect(raw.value).not.toContain(plaintext);
    });

    it('stores the NAS password only via safeStorage.encryptString', () => {
      const plaintext = 'hunter2';
      service.setNasPassword(plaintext);

      const raw = db.prepare('SELECT value FROM Settings WHERE key = ?').get('nasPassword') as {
        value: string;
      };
      const expectedCiphertext = safeStorage.encryptString(plaintext).toString('base64');

      expect(raw.value).toBe(expectedCiphertext);
    });

    it('throws rather than reading/writing the NAS password when encryption is unavailable', () => {
      safeStorage.setAvailable(false);

      expect(() => service.setNasPassword('secret')).toThrow(/safeStorage encryption is not available/);

      // A password stored while encryption was available still can't be
      // read back once encryption becomes unavailable.
      safeStorage.setAvailable(true);
      service.setNasPassword('secret');
      safeStorage.setAvailable(false);
      expect(() => service.getNasPassword()).toThrow(/safeStorage encryption is not available/);
    });
  });

  describe('reserved key guard', () => {
    it('refuses to read the NAS password key via the generic get()', () => {
      expect(() => service.get('nasPassword')).toThrow(/use getNasPassword\(\) instead/);
    });

    it('refuses to write the NAS password key via the generic set()', () => {
      expect(() => service.set('nasPassword', 'plaintext-attempt')).toThrow(
        /use setNasPassword\(\) instead/,
      );

      // Confirms the guard fired before anything touched the DB.
      const raw = db.prepare('SELECT value FROM Settings WHERE key = ?').get('nasPassword') as
        | { value: string }
        | undefined;
      expect(raw).toBeUndefined();
    });
  });
});
