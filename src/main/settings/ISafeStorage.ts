/**
 * The subset of Electron's `safeStorage` module `SettingsService` needs
 * (architecture.md §2: "Secrets storage — Electron safeStorage, falls back
 * to Windows Credential Manager if needed").
 *
 * Kept as a narrow interface — rather than importing `electron` directly —
 * so `SettingsService` can be constructor-injected with the real
 * `safeStorage` singleton in production and a fake in unit tests, per SRS §5
 * Dependency Injection ("services should depend on interfaces where
 * possible"). Electron's `safeStorage` isn't available under plain
 * Node/Vitest, which is how these unit tests run.
 */
export interface ISafeStorage {
  isEncryptionAvailable(): boolean;
  encryptString(plainText: string): Buffer;
  decryptString(encrypted: Buffer): string;
}
