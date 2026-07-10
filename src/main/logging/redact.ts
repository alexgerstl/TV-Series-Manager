const SENSITIVE_KEY_PATTERN = /password|credential/i;
const REDACTED_PLACEHOLDER = '[REDACTED]';

/**
 * Recursively replaces the value of any object key matching
 * `password`/`credential` (case-insensitive, substring match — so
 * `nasPassword`, `Credentials`, etc. are all caught) with a fixed
 * placeholder. Architecture.md §6 security rule, factored out as a pure
 * function so it's independently unit-testable from `LoggingService`.
 */
export function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item));
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      result[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED_PLACEHOLDER : redact(entry);
    }
    return result;
  }

  return value;
}
