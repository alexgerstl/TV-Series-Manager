import type { SettingsRepository } from '../database/repositories/SettingsRepository';

import type { ISafeStorage } from './ISafeStorage';
import type { ISettingsService } from './ISettingsService';

/**
 * Reserved `Settings.key` for the encrypted NAS password. Not exported for
 * general use — access is only through `getNasPassword`/`setNasPassword` so
 * the plaintext-Settings-table guarantee (SRS §24, decisions.md) can't be
 * bypassed by calling `get`/`set` with this key directly.
 */
const NAS_PASSWORD_KEY = 'nasPassword';

/**
 * Wraps `SettingsRepository` with typed read/write plus the encrypted NAS
 * credential path (architecture.md §5.4, §6). Never persists the NAS
 * password as plaintext — encryption goes through the injected
 * `ISafeStorage` (Electron's `safeStorage` in production).
 */
export class SettingsService implements ISettingsService {
  constructor(
    private readonly repository: SettingsRepository,
    private readonly safeStorage: ISafeStorage,
  ) {}

  get(key: string): string | null {
    if (key === NAS_PASSWORD_KEY) {
      throw new Error(
        `SettingsService.get: '${NAS_PASSWORD_KEY}' is a secret — use getNasPassword() instead`,
      );
    }
    return this.repository.get(key);
  }

  set(key: string, value: string): void {
    if (key === NAS_PASSWORD_KEY) {
      throw new Error(
        `SettingsService.set: '${NAS_PASSWORD_KEY}' is a secret — use setNasPassword() instead`,
      );
    }
    this.repository.set(key, value);
  }

  getNasPassword(): string | null {
    const stored = this.repository.get(NAS_PASSWORD_KEY);
    if (stored === null) {
      return null;
    }

    this.assertEncryptionAvailable();
    return this.safeStorage.decryptString(Buffer.from(stored, 'base64'));
  }

  setNasPassword(password: string): void {
    this.assertEncryptionAvailable();
    const encrypted = this.safeStorage.encryptString(password);
    this.repository.set(NAS_PASSWORD_KEY, encrypted.toString('base64'));
  }

  private assertEncryptionAvailable(): void {
    if (!this.safeStorage.isEncryptionAvailable()) {
      throw new Error(
        'SettingsService: safeStorage encryption is not available on this system — refusing to read/write the NAS password',
      );
    }
  }
}
