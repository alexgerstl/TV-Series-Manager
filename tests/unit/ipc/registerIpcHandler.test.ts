import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { registerIpcHandler } from '../../../src/main/ipc/registerIpcHandler';
import { ErrorCode } from '../../../src/shared/errors/ErrorCode';

import { FakeIpcMain, FakeLoggingService } from './fakes';

const testSchema = z.object({ value: z.number() });

describe('registerIpcHandler', () => {
  let ipcMain: FakeIpcMain;
  let logging: FakeLoggingService;

  beforeEach(() => {
    ipcMain = new FakeIpcMain();
    logging = new FakeLoggingService();
  });

  it('calls the handler with the parsed request and returns a success envelope', async () => {
    registerIpcHandler(ipcMain, logging, 'test:double', testSchema, ({ value }) => value * 2);

    const result = await ipcMain.invoke('test:double', { value: 21 });

    expect(result).toEqual({ success: true, data: 42 });
  });

  it('awaits an async handler', async () => {
    registerIpcHandler(ipcMain, logging, 'test:async', testSchema, async ({ value }) => {
      await Promise.resolve();
      return value + 1;
    });

    const result = await ipcMain.invoke('test:async', { value: 1 });

    expect(result).toEqual({ success: true, data: 2 });
  });

  it('rejects a request that fails schema validation without calling the handler', async () => {
    let handlerCalled = false;
    registerIpcHandler(ipcMain, logging, 'test:double', testSchema, ({ value }) => {
      handlerCalled = true;
      return value;
    });

    const result = await ipcMain.invoke('test:double', { value: 'not a number' });

    expect(handlerCalled).toBe(false);
    expect(result).toMatchObject({
      success: false,
      error: { code: ErrorCode.VALIDATION_FAILED },
    });
  });

  it('logs a warning (not an error) for a validation failure', async () => {
    registerIpcHandler(ipcMain, logging, 'test:double', testSchema, ({ value }) => value);

    await ipcMain.invoke('test:double', {});

    expect(logging.warnCalls).toHaveLength(1);
    expect(logging.warnCalls[0]?.source).toBe('ipc');
    expect(logging.errorCalls).toHaveLength(0);
  });

  it('catches a thrown error, logs it, and returns a sanitized error envelope', async () => {
    registerIpcHandler(ipcMain, logging, 'test:boom', testSchema, () => {
      throw new Error('kaboom');
    });

    const result = await ipcMain.invoke('test:boom', { value: 1 });

    expect(result).toEqual({
      success: false,
      error: { code: ErrorCode.INTERNAL_ERROR, message: 'kaboom' },
    });
    expect(logging.errorCalls).toHaveLength(1);
    expect(logging.errorCalls[0]?.error).toBeInstanceOf(Error);
  });

  it('catches a rejected async handler the same way', async () => {
    registerIpcHandler(ipcMain, logging, 'test:boom-async', testSchema, () => {
      return Promise.reject(new Error('async kaboom'));
    });

    const result = await ipcMain.invoke('test:boom-async', { value: 1 });

    expect(result).toMatchObject({
      success: false,
      error: { code: ErrorCode.INTERNAL_ERROR, message: 'async kaboom' },
    });
  });

  it('never lets a raw Error object reach the returned envelope', async () => {
    registerIpcHandler(ipcMain, logging, 'test:boom', testSchema, () => {
      throw new Error('sensitive stack detail');
    });

    const result = (await ipcMain.invoke('test:boom', { value: 1 })) as {
      success: false;
      error: { code: ErrorCode; message: string };
    };

    expect(Object.keys(result.error)).not.toContain('stack');
    expect(result.error).not.toBeInstanceOf(Error);
  });
});
