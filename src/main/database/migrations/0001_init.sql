-- 0001_init.sql
--
-- Placeholder initial migration for M1.2 (database connection + migration
-- runner). Intentionally a no-op: it exists to prove the migration pipeline
-- discovers, orders, applies, and records migrations correctly end-to-end.
--
-- The actual application schema (Settings, ManagedSeries, LookupHistory,
-- MKVMetadata, Logs, ToolConfiguration, SyncLog per architecture.md §4.2)
-- is created in 0002_core_schema.sql as part of M1.3.

SELECT 1;
