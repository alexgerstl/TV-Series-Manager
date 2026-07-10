import { describe, expect, it } from 'vitest';

import { ErrorCode } from '../../../src/shared/errors/ErrorCode';
import { fail, ok } from '../../../src/shared/ipc-contracts/IpcResult';

describe('IpcResult helpers', () => {
  it('ok() wraps data in a success envelope', () => {
    expect(ok(42)).toEqual({ success: true, data: 42 });
    expect(ok(null)).toEqual({ success: true, data: null });
  });

  it('fail() wraps a code/message in an error envelope', () => {
    expect(fail(ErrorCode.VALIDATION_FAILED, 'bad input')).toEqual({
      success: false,
      error: { code: ErrorCode.VALIDATION_FAILED, message: 'bad input' },
    });
  });

  it('fail() includes details only when provided', () => {
    const withDetails = fail(ErrorCode.INTERNAL_ERROR, 'oops', { cause: 'x' });
    expect(withDetails).toEqual({
      success: false,
      error: { code: ErrorCode.INTERNAL_ERROR, message: 'oops', details: { cause: 'x' } },
    });

    const withoutDetails = fail(ErrorCode.INTERNAL_ERROR, 'oops');
    expect('details' in withoutDetails.error).toBe(false);
  });
});
