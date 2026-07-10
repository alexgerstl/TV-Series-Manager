import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Database } from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDatabaseConnection } from '../../../src/main/database/connection';
import { runMigrations } from '../../../src/main/database/migrationRunner';
import { LogsRepository } from '../../../src/main/database/repositories/LogsRepository';
import type { IConsoleSink } from '../../../src/main/logging/IConsoleSink';
import { LoggingService } from '../../../src/main/logging/LoggingService';

const MIGRATIONS_DIR = fileURLToPath(
  new URL('../../../src/main/database/migrations', import.meta.url),
);

interface ConsoleSinkCall {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
}

class FakeConsoleSink implements IConsoleSink {
  public readonly calls: ConsoleSinkCall[] = [];

  debug(message: string): void {
    this.calls.push({ level: 'debug', message });
  }

  info(message: string): void {
    this.calls.push({ level: 'info', message });
  }

  warn(message: string): void {
    this.calls.push({ level: 'warn', message });
  }

  error(message: string): void {
    this.calls.push({ level: 'error', message });
  }
}

interface LogRow {
  id: number;
  timestamp: string;
  level: string;
  source: string;
  message: string;
  exception: string | null;
}

describe('LoggingService', () => {
  let tempDir: string;
  let db: Database;
  let repository: LogsRepository;
  let consoleSink: FakeConsoleSink;
  let service: LoggingService;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'tvsm-logging-service-test-'));
    db = createDatabaseConnection(join(tempDir, 'test.sqlite'));
    runMigrations(db, MIGRATIONS_DIR);

    repository = new LogsRepository(db);
    consoleSink = new FakeConsoleSink();
    service = new LoggingService(repository, consoleSink);
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  function readAllLogs(): LogRow[] {
    return db.prepare('SELECT * FROM Logs ORDER BY id').all() as LogRow[];
  }

  it('persists an info entry with correct level/source/message/timestamp', () => {
    service.info('ProcessingEngine', 'Started processing batch');

    const rows = readAllLogs();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      level: 'info',
      source: 'ProcessingEngine',
      message: 'Started processing batch',
      exception: null,
    });
    expect(rows[0]?.timestamp).toBeTruthy();
  });

  it.each(['debug', 'info', 'warn'] as const)('persists a %s-level entry with the correct level', (level) => {
    service[level]('Test', 'a message');
    expect(readAllLogs()[0]?.level).toBe(level);
  });

  it('persists an error entry with the exception stack, when an Error is passed', () => {
    service.error('NASService', 'Mount failed', new Error('mount failed'));

    const rows = readAllLogs();
    expect(rows[0]?.level).toBe('error');
    expect(rows[0]?.exception).toContain('mount failed');
  });

  it('persists an error entry with a null exception when no error is passed', () => {
    service.error('NASService', 'Mount failed');
    expect(readAllLogs()[0]?.exception).toBeNull();
  });

  it('formats a non-Error thrown value via String()', () => {
    service.error('NASService', 'Mount failed', 'net use exited with code 53');
    expect(readAllLogs()[0]?.exception).toBe('net use exited with code 53');
  });

  it('also writes to the console sink at the matching level, prefixed with the source', () => {
    service.warn('NASService', 'Retrying connection');

    expect(consoleSink.calls).toHaveLength(1);
    expect(consoleSink.calls[0]).toMatchObject({ level: 'warn' });
    expect(consoleSink.calls[0]?.message).toBe('[NASService] Retrying connection');
  });

  describe('redaction (architecture.md §6: no field named password/credential is ever logged)', () => {
    it('redacts a password field in the persisted message, without dropping other context', () => {
      service.info('NASService', 'Mounting NAS', { username: 'admin', password: 'hunter2' });

      const message = readAllLogs()[0]?.message ?? '';
      expect(message).not.toContain('hunter2');
      expect(message).toContain('[REDACTED]');
      expect(message).toContain('admin');
    });

    it('redacts a credential field regardless of casing', () => {
      service.info('NASService', 'Authenticating', { Credential: 'super-secret-token' });

      const message = readAllLogs()[0]?.message ?? '';
      expect(message).not.toContain('super-secret-token');
      expect(message).toContain('[REDACTED]');
    });

    it('redacts a nested password field', () => {
      service.info('NASService', 'Config loaded', {
        nas: { host: '192.168.0.7', password: 'hunter2' },
      });

      const message = readAllLogs()[0]?.message ?? '';
      expect(message).not.toContain('hunter2');
      expect(message).toContain('192.168.0.7');
    });

    it('never sends the raw password to the console sink either', () => {
      service.info('NASService', 'Mounting NAS', { password: 'hunter2' });
      expect(consoleSink.calls[0]?.message).not.toContain('hunter2');
    });
  });
});
