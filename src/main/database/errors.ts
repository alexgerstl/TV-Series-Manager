/**
 * Thrown when a migration fails to apply. Carries the offending migration's
 * version/filename so the (eventual) LoggingService — and, until M1.6 lands,
 * the temporary console logging in `main.ts` — can report exactly which
 * migration broke, per architecture.md §4.3: "app refuses to start if a
 * migration fails."
 */
export class MigrationError extends Error {
  public readonly version: number;
  public readonly fileName: string;

  constructor(version: number, fileName: string, cause: unknown) {
    const causeMessage = cause instanceof Error ? cause.message : String(cause);
    super(`Migration ${fileName} (version ${version}) failed to apply: ${causeMessage}`);
    this.name = 'MigrationError';
    this.version = version;
    this.fileName = fileName;
    this.cause = cause;
  }
}
