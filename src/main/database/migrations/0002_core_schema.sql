-- 0002_core_schema.sql
--
-- Creates the application schema per architecture.md §4.2: Settings,
-- ManagedSeries, LookupHistory, MKVMetadata, Logs, ToolConfiguration, and
-- SyncLog (the last one added during the architecture pass to close the
-- SRS §17.11 per-file NAS sync logging gap that the original SRS §8 schema
-- did not account for).
--
-- Requires `PRAGMA foreign_keys = ON` (set by connection.ts) for the
-- LookupHistory -> ManagedSeries cascade-delete relationship to take effect.

CREATE TABLE Settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE ManagedSeries (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL,
  normalizedName  TEXT NOT NULL,
  lookupEnabled   INTEGER NOT NULL DEFAULT 1,
  created         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_managedseries_normalizedname ON ManagedSeries(normalizedName);

CREATE TABLE LookupHistory (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  seriesId              INTEGER NOT NULL REFERENCES ManagedSeries(id) ON DELETE CASCADE,
  lookupDate            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  highestLocalEpisode   TEXT,
  latestOnlineEpisode   TEXT,
  newEpisodeCount       INTEGER NOT NULL DEFAULT 0,
  status                TEXT NOT NULL,          -- 'UP_TO_DATE' | 'NEW_EPISODES' | 'FAILED'
  searchUrl             TEXT
);
CREATE INDEX idx_lookuphistory_seriesid ON LookupHistory(seriesId);
CREATE INDEX idx_lookuphistory_lookupdate ON LookupHistory(lookupDate);

CREATE TABLE MKVMetadata (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  fullPath  TEXT NOT NULL,
  fileSize  INTEGER NOT NULL,
  modified  DATETIME NOT NULL,
  json      TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_mkvmetadata_fullpath ON MKVMetadata(fullPath);

CREATE TABLE Logs (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  level     TEXT NOT NULL,          -- 'debug' | 'info' | 'warn' | 'error'
  source    TEXT NOT NULL,          -- service name, e.g. 'ProcessingEngine'
  message   TEXT NOT NULL,
  exception TEXT
);
CREATE INDEX idx_logs_timestamp ON Logs(timestamp);
CREATE INDEX idx_logs_level ON Logs(level);

CREATE TABLE ToolConfiguration (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  executable  TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_toolconfiguration_name ON ToolConfiguration(name);

-- Closes the SRS §17.11 sync-logging gap (see architecture.md §4.1).
CREATE TABLE SyncLog (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  operation     TEXT NOT NULL,      -- 'COPY' | 'MOVE'
  sourcePath    TEXT NOT NULL,
  destPath      TEXT NOT NULL,
  durationMs    INTEGER,
  verified      INTEGER NOT NULL DEFAULT 0,   -- boolean
  verifyMethod  TEXT,                -- e.g. 'sha256' — pinned once §17.7 method is finalized
  result        TEXT NOT NULL,      -- 'SUCCESS' | 'FAILED' | 'PAUSED'
  errorMessage  TEXT
);
CREATE INDEX idx_synclog_timestamp ON SyncLog(timestamp);
