import { describe, expect, it } from 'vitest';

import { redact } from '../../../src/main/logging/redact';

describe('redact', () => {
  it('redacts a top-level "password" field', () => {
    expect(redact({ password: 'hunter2' })).toEqual({ password: '[REDACTED]' });
  });

  it('redacts case-insensitively', () => {
    expect(redact({ Password: 'a', PASSWORD: 'b' })).toEqual({
      Password: '[REDACTED]',
      PASSWORD: '[REDACTED]',
    });
  });

  it('redacts keys containing "password" or "credential" as a substring', () => {
    expect(redact({ nasPassword: 'a', apiCredential: 'b', credentials: 'c' })).toEqual({
      nasPassword: '[REDACTED]',
      apiCredential: '[REDACTED]',
      credentials: '[REDACTED]',
    });
  });

  it('leaves non-sensitive fields untouched', () => {
    expect(redact({ username: 'admin', host: '192.168.0.7' })).toEqual({
      username: 'admin',
      host: '192.168.0.7',
    });
  });

  it('redacts nested objects', () => {
    expect(redact({ nas: { host: '192.168.0.7', password: 'hunter2' } })).toEqual({
      nas: { host: '192.168.0.7', password: '[REDACTED]' },
    });
  });

  it('redacts objects nested inside arrays', () => {
    expect(
      redact({
        accounts: [
          { user: 'a', password: '1' },
          { user: 'b', password: '2' },
        ],
      }),
    ).toEqual({
      accounts: [
        { user: 'a', password: '[REDACTED]' },
        { user: 'b', password: '[REDACTED]' },
      ],
    });
  });

  it('passes primitives through unchanged', () => {
    expect(redact('hello')).toBe('hello');
    expect(redact(42)).toBe(42);
    expect(redact(null)).toBeNull();
    expect(redact(undefined)).toBeUndefined();
  });
});
