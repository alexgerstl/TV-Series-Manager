import { describe, expect, it } from 'vitest';

import {
  settingsGetRequestSchema,
  settingsSetRequestSchema,
} from '../../../src/shared/ipc-contracts/settings';

describe('settingsGetRequestSchema', () => {
  it('accepts a valid request', () => {
    expect(settingsGetRequestSchema.safeParse({ key: 'theme' }).success).toBe(true);
  });

  it('rejects a missing key', () => {
    expect(settingsGetRequestSchema.safeParse({}).success).toBe(false);
  });

  it('rejects an empty-string key', () => {
    expect(settingsGetRequestSchema.safeParse({ key: '' }).success).toBe(false);
  });

  it('rejects a non-string key', () => {
    expect(settingsGetRequestSchema.safeParse({ key: 42 }).success).toBe(false);
  });
});

describe('settingsSetRequestSchema', () => {
  it('accepts a valid request', () => {
    expect(settingsSetRequestSchema.safeParse({ key: 'theme', value: 'dark' }).success).toBe(true);
  });

  it('accepts an empty-string value (only the key is required to be non-empty)', () => {
    expect(settingsSetRequestSchema.safeParse({ key: 'theme', value: '' }).success).toBe(true);
  });

  it('rejects a missing value', () => {
    expect(settingsSetRequestSchema.safeParse({ key: 'theme' }).success).toBe(false);
  });

  it('rejects an empty-string key', () => {
    expect(settingsSetRequestSchema.safeParse({ key: '', value: 'dark' }).success).toBe(false);
  });
});
