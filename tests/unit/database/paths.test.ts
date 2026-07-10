import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { getDefaultDatabasePath } from '../../../src/main/database/paths';

describe('getDefaultDatabasePath', () => {
  it('joins the userData directory with the database filename', () => {
    const result = getDefaultDatabasePath('/some/user/data/dir');
    expect(result).toBe(join('/some/user/data/dir', 'tv-series-manager.sqlite'));
  });

  it('works with Windows-style paths', () => {
    const result = getDefaultDatabasePath('C:\\Users\\alexg\\AppData\\Roaming\\tv-series-manager');
    expect(result.endsWith('tv-series-manager.sqlite')).toBe(true);
  });
});
