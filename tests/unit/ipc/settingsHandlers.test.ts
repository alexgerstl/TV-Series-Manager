import { beforeEach, describe, expect, it } from 'vitest';

import { registerSettingsHandlers } from '../../../src/main/ipc/settingsHandlers';
import type { ISettingsService } from '../../../src/main/settings';
import { ErrorCode } from '../../../src/shared/errors/ErrorCode';

import { FakeIpcMain, FakeLoggingService } from './fakes';

class FakeSettingsService implements ISettingsService {
  private readonly store = new Map<string, string>();
  public nasPassword: string | null = null;

  get(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.store.set(key, value);
  }

  getNasPassword(): string | null {
    return this.nasPassword;
  }

  setNasPassword(password: string): void {
    this.nasPassword = password;
  }
}

describe('registerSettingsHandlers', () => {
  let ipcMain: FakeIpcMain;
  let logging: FakeLoggingService;
  let settingsService: FakeSettingsService;

  beforeEach(() => {
    ipcMain = new FakeIpcMain();
    logging = new FakeLoggingService();
    settingsService = new FakeSettingsService();
    registerSettingsHandlers(ipcMain, settingsService, logging);
  });

  describe('settings:get', () => {
    it('returns the stored value wrapped in a success envelope', async () => {
      settingsService.set('theme', 'dark');

      const result = await ipcMain.invoke('settings:get', { key: 'theme' });

      expect(result).toEqual({ success: true, data: 'dark' });
    });

    it('returns null (still a success envelope) for an unset key', async () => {
      const result = await ipcMain.invoke('settings:get', { key: 'unset' });
      expect(result).toEqual({ success: true, data: null });
    });

    it('rejects a request missing the key field', async () => {
      const result = await ipcMain.invoke('settings:get', {});
      expect(result).toMatchObject({ success: false, error: { code: ErrorCode.VALIDATION_FAILED } });
    });

    it('rejects an empty-string key', async () => {
      const result = await ipcMain.invoke('settings:get', { key: '' });
      expect(result).toMatchObject({ success: false, error: { code: ErrorCode.VALIDATION_FAILED } });
    });
  });

  describe('settings:set', () => {
    it('persists the value and returns a success envelope', async () => {
      const result = await ipcMain.invoke('settings:set', { key: 'theme', value: 'dark' });

      expect(result).toEqual({ success: true, data: null });
      expect(settingsService.get('theme')).toBe('dark');
    });

    it('rejects a request missing the value field', async () => {
      const result = await ipcMain.invoke('settings:set', { key: 'theme' });
      expect(result).toMatchObject({ success: false, error: { code: ErrorCode.VALIDATION_FAILED } });
    });
  });
});
