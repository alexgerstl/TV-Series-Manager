/**
 * Typed config read/write over the `Settings` table, plus a dedicated
 * encrypted path for the NAS password (architecture.md §1.2 Major
 * Components, §5.4 "Authentication" Flow, §6 Security Architecture).
 */
export interface ISettingsService {
  /** Reads a non-secret setting. Returns `null` if unset. */
  get(key: string): string | null;

  /** Writes a non-secret setting (upsert). */
  set(key: string, value: string): void;

  /**
   * Decrypts and returns the stored NAS password, or `null` if none has
   * been set. Per architecture.md §5.4, the decrypted value is intended to
   * live only in-memory, only for the duration of a `net use` call — the
   * caller (`NASService`, M6.2) is responsible for not logging or otherwise
   * persisting it.
   */
  getNasPassword(): string | null;

  /** Encrypts `password` via `safeStorage` and persists the ciphertext. */
  setNasPassword(password: string): void;
}
