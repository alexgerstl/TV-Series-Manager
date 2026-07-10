/**
 * `Statement.get()` types its return as `T | undefined` since a plain SELECT
 * can legitimately match nothing. For an `INSERT ... RETURNING`, `undefined`
 * would mean the insert failed silently — unreachable in practice, since
 * better-sqlite3 throws synchronously on constraint violations — so this
 * turns that impossible case into a loud programming-error throw rather than
 * pushing `| null` onto every repository `create()` return type.
 */
export function expectRow<T>(row: T | undefined, context: string): T {
  if (row === undefined) {
    throw new Error(`${context}: expected INSERT ... RETURNING to return a row, got none`);
  }
  return row;
}
