# TV Series Manager — Progress Tracker

This file tracks implementation status against the roadmap in `architecture.md` §9. Update it at the end of every approved task.

Status values: `Not Started` · `In Progress` · `Blocked` · `Done`

---

## Status Summary

| Milestone | Status | Tasks Done |
|---|---|---|
| M1 — Foundation | In Progress | 6 / 8 |
| M2 — Parser + File Monitor | Not Started | 0 / 4 |
| M3 — MKVToolNix Integration | Not Started | 0 / 7 |
| M4 — Processing Engine | Not Started | 0 / 6 |
| M5 — Tools Page | Not Started | 0 / 3 |
| M6 — NAS Sync | Not Started | 0 / 6 |
| M7 — Web Lookup | Not Started | 0 / 5 |
| M8 — Settings, Logs, Packaging | Not Started | 0 / 4 |
| M9 — Hardening | Not Started | 0 / 3 |

**Overall: 6 / 46 tasks complete.**

---

## Milestone 1 — Foundation

| Task | Status | Date | Notes |
|---|---|---|---|
| M1.1 — Project scaffold | **Done** | 2026-07-10 | Electron+React+TS scaffold, ESLint/Prettier/Vitest/electron-builder wired. `typecheck`/`lint`/`test`/`build` all verified clean. Live `npm run dev` window launch manually verified on Windows — confirmed working 2026-07-10 after resolving a local Electron binary install issue (see note below). |
| M1.2 — Database connection + migration runner | **Done** | 2026-07-10 | `better-sqlite3` connection module (WAL + foreign_keys pragmas), migration runner (`schema_migrations` table, per-migration transactions, fail-loud on error, idempotent re-run), placeholder `0001_init.sql`. Wired into `main.ts` startup — halts app on migration failure. 15 unit tests covering fresh-apply, idempotency, partial-new-migration runs, rollback-on-bad-SQL, retry-after-fix, duplicate-version rejection, and non-migration-file filtering. **Post-implementation fix (same day):** dev machine's Node 24 + Node 20 EOL required bumping `better-sqlite3` to v12 and the Node engine target to 22+ (see decisions.md); also hit and fixed an Electron-vs-Node native-module ABI mismatch via `predev`/`prebuild`/`pretest` rebuild hooks (see decisions.md). Verified working end-to-end on the dev machine — `npm run dev` launches cleanly. |
| M1.3 — Core schema migration | **Done** | 2026-07-10 | `0002_core_schema.sql` creates all 7 tables per architecture.md §4.2 (Settings, ManagedSeries, LookupHistory, MKVMetadata, Logs, ToolConfiguration, SyncLog) with all specified indexes. 15 integration tests against the real migration files: table/column shape per table, all indexes present, unique-constraint rejection (ManagedSeries.normalizedName, MKVMetadata.fullPath, ToolConfiguration.name), FK cascade-delete verified functionally (deleting a ManagedSeries row removes its LookupHistory rows), FK rejection of an orphan seriesId, default values (lookupEnabled=1, verified=0), and idempotent re-run at schema version 2. |
| M1.4 — Repository layer skeleton | **Done** | 2026-07-10 | One repository class per entity (`SettingsRepository` get/set/getAll; `ManagedSeriesRepository`, `LookupHistoryRepository`, `MKVMetadataRepository`, `LogsRepository`, `ToolConfigurationRepository`, `SyncLogRepository` each with create/find methods) under `src/main/database/repositories/`, all constructor-injected with a `Database` handle — no raw SQL outside this layer. Row/domain types added under `src/main/models/` (one file per entity, matching architecture.md §3.1's folder layout) and re-exported through `database/index.ts`. 36 unit tests against a real temp SQLite DB (migrated via the actual migration files), covering create/read for every repository plus unique-constraint and FK-rejection behavior already proven at the schema level in M1.3. `typecheck`/`lint`/`test` all clean (66/66 tests passing). |
| M1.5 — Settings Service + safeStorage integration | **Done** | 2026-07-10 | `SettingsService` (`src/main/settings/`) wraps `SettingsRepository` behind `ISettingsService`; generic `get`/`set` round-trip plaintext for non-secret keys. NAS password gets a dedicated encrypted path (`getNasPassword`/`setNasPassword`) via an injected `ISafeStorage` interface (narrow wrapper matching Electron's `safeStorage.isEncryptionAvailable`/`encryptString`/`decryptString`, DI'd so the service is unit-testable under plain Node/Vitest without a real Electron runtime — production wiring to Electron's real `safeStorage` deferred to whichever task first consumes it, e.g. M6.2). Ciphertext is base64-encoded into the `TEXT` value column. The reserved `nasPassword` key is hard-blocked from the generic `get`/`set` path (throws), so the "never plaintext" guarantee can't be bypassed by accident. 10 unit tests: plaintext round-trip asserted directly against raw DB bytes; NAS password round-trip; raw-DB-bytes assertion proving the stored value is neither the plaintext nor a containing substring of it, and matches `safeStorage.encryptString` exactly; safeStorage-unavailable failure path; reserved-key guard on both `get` and `set`. |
| M1.6 — Logging Service | **Done** | 2026-07-10 | `LoggingService` (`src/main/logging/`) writes structured entries to the `Logs` table via `LogsRepository` and a console sink, one method per level (`debug`/`info`/`warn`/`error`). Console sink is behind an injected `IConsoleSink` interface — real implementation (`createPinoConsoleSink`) wraps `pino` (added as a new dependency, `^9.14.0`, per architecture.md §2/§3.1), fake implementation used in tests so no service code depends on pino directly. Redaction rule (architecture.md §6): a pure `redact()` function recursively replaces the value of any object key matching `password`/`credential` (case-insensitive substring) with `[REDACTED]` before a log call's context is serialized into the persisted `message` — applied identically to both the DB write and the console sink. `error()` accepts the causing error separately and stores its stack (or `String(value)` for non-`Error` throws) in the `exception` column. 19 unit tests: 7 for `redact()` in isolation (top-level/case-insensitive/substring/nested/array-nested/non-sensitive-passthrough/primitive-passthrough), 12 for `LoggingService` against a real temp SQLite DB — level/source/message/timestamp persistence, exception population, console-sink mirroring, and the redaction-in-persisted-message guarantee explicitly (including nested-field and console-sink cases). |
| M1.7 — IPC contract scaffolding + shared error types | Not Started | | |
| M1.8 — Empty tab shell UI | Not Started | | |

## Milestone 2 — Parser + File Monitor

| Task | Status | Date | Notes |
|---|---|---|---|
| M2.1 — Parser: filename corpus + pure parsing function | Not Started | | |
| M2.2 — Folder-name generator | Not Started | | |
| M2.3 — File Monitor service (chokidar wrapper) | Not Started | | |
| M2.4 — Monitor IPC + live Incoming grid | Not Started | | |

## Milestone 3 — MKVToolNix Integration

| Task | Status | Date | Notes |
|---|---|---|---|
| M3.1 — MKVToolNixService: inspection + JSON parsing | Not Started | | |
| M3.2 — Metadata cache (path+size+modified) | Not Started | | |
| M3.3 — Startup validation + Tools-page MKVToolNix status | Not Started | | |
| M3.4 — Media Information Dialog | Not Started | | |
| M3.5 — Incoming view "Embedded English"/"Audio" columns | Not Started | | |
| M3.6 — Single + batch subtitle extraction | Not Started | | |
| M3.7 — Subtitle Details Dialog | Not Started | | |

## Milestone 4 — Processing Engine

| Task | Status | Date | Notes |
|---|---|---|---|
| M4.1 — Converted-file matching (decision #1) | Not Started | | |
| M4.2 — Subtitle Service: external subtitle matching + rename | Not Started | | |
| M4.3 — Processing Engine: single-episode step sequence | Not Started | | |
| M4.4 — Confirmation dialog flow | Not Started | | |
| M4.5 — Existing-subtitle conflict + multi-subtitle selection dialogs | Not Started | | |
| M4.6 — Batch processing + progress/cancellation | Not Started | | |

## Milestone 5 — Tools Page

| Task | Status | Date | Notes |
|---|---|---|---|
| M5.1 — Tools Service: external app launch + verification | Not Started | | |
| M5.2 — SSH launcher | Not Started | | |
| M5.3 — Workflow shortcuts + "Open All Local Folders" | Not Started | | |

## Milestone 6 — NAS Sync

| Task | Status | Date | Notes |
|---|---|---|---|
| M6.1 — NAS Service: online/offline detection + status polling | Not Started | | |
| M6.2 — Mount/Unmount | Not Started | | |
| M6.3 — Compare | Not Started | | |
| M6.4 — Copy Missing Files | Not Started | | |
| M6.5 — Move Missing Files (copy → verify → delete) | Not Started | | Safety-critical — see decision #2. |
| M6.6 — Failure recovery (NAS disconnects mid-sync) | Not Started | | |

## Milestone 7 — Web Lookup

| Task | Status | Date | Notes |
|---|---|---|---|
| M7.1 — Managed Series CRUD | Not Started | | |
| M7.2 — Local progress determination (decision #3) | Not Started | | |
| M7.3 — URL generation + name normalization | Not Started | | |
| M7.4 — RLSBBProvider: search + HTML parsing | Not Started | | |
| M7.5 — Lookup execution + progress + results UI | Not Started | | |

## Milestone 8 — Settings, Logs, Packaging

| Task | Status | Date | Notes |
|---|---|---|---|
| M8.1 — Full Settings page | Not Started | | |
| M8.2 — Export/Import settings, reset cache/settings | Not Started | | |
| M8.3 — Logs tab | Not Started | | |
| M8.4 — Packaging: installer + portable build | Not Started | | |

## Milestone 9 — Hardening

| Task | Status | Date | Notes |
|---|---|---|---|
| M9.1 — 20,000-file performance benchmark | Not Started | | |
| M9.2 — Security review pass | Not Started | | |
| M9.3 — Coverage push to 80%+ | Not Started | | |

---

## Known Technical Debt / Open Follow-ups

Carried forward from completed tasks — resolve opportunistically or dedicate cleanup time before M9.

- **From M1.1:** `import/no-default-export` set to `warn` (not `error`) with `.tsx` exempted — revisit once more of the codebase exists.
- **From M1.1:** `docs/` folder in the scaffold is currently empty — SRS/decisions.md/architecture.md not yet copied in.
- **From M1.1:** `eslint-import-resolver-typescript` required `--legacy-peer-deps` to install due to an ESLint 8/9 peer-range mismatch upstream. Lint runs clean; flagging in case this conflicts with a stricter dependency policy later.
- **Resolved 2026-07-10:** Local `npm install` on the dev machine did not download the Electron binary (postinstall's `@electron/get` step failed silently — `ignore-scripts` was `false`, so likely a network/firewall restriction on GitHub release downloads specifically, since general npm registry access worked fine). Worked around by manually downloading `electron-v31.2.0-win32-x64.zip`, extracting it flat into `node_modules\electron\dist\`, and writing `node_modules\electron\dist\path.txt` containing exactly `electron.exe` (no trailing CRLF — `echo` on Windows appends one and breaks the spawn call with an `ENOENT` on a literal `electron.exe\r\n` path; use `Set-Content -NoNewline` instead). `npm run dev` now launches correctly. **Follow-up:** if this recurs on a clean setup or CI machine, the root network restriction should be diagnosed/allow-listed rather than repeating the manual workaround each time — worth a line in the README setup instructions once M8.4 (packaging) is reached.
- **From M1.2:** `main.ts` logs database startup/failure via `console.log`/`console.error` as a deliberate placeholder — will be replaced with `LoggingService` (structured logging to the `Logs` table) in M1.6. Not a defect, just sequencing; flagging so it isn't mistaken for an oversight.
- **Resolved 2026-07-10:** `better-sqlite3@11.10.0` had no prebuilt binary for Node 24 (dev machine's runtime), which made `npm install` fall back to source compilation requiring Python/node-gyp. Root cause: `architecture.md` was pinned to Node 20 LTS, which reached EOL in April 2026. Fixed by bumping `better-sqlite3` to `^12.11.1` (Node 24 prebuild support) and the `engines.node` target to `>=22.0.0`; `architecture.md` §2 updated accordingly. Logged as a dated decision in `decisions.md`.
- **Resolved 2026-07-10:** After the above fix, the `better-sqlite3` native binary still failed to load inside the actual Electron app with `ERR_DLOPEN_FAILED` / NODE_MODULE_VERSION mismatch — Electron embeds its own Node/V8 build with a different ABI than the system Node.js used by Vitest. Fixed by adding `@electron/rebuild` and wiring `predev`/`prebuild` → rebuild for Electron's ABI, `pretest` → rebuild for plain Node's ABI, via npm's automatic `pre<script>` hooks. Verified both directions round-trip cleanly (tests pass after `pretest`, app loads the module correctly after `predev`/`prebuild`, confirmed via `ELECTRON_RUN_AS_NODE=1`). Logged in `decisions.md`; **follow-up for future tasks:** any new native (main-process-only) dependency will need the same `-w <package>` treatment added to these three scripts.

---

## Change Log

| Date | Change |
|---|---|
| 2026-07-10 | File created. M1.1 marked Done. |
| 2026-07-10 | M1.1 fully closed out — live `npm run dev` window launch verified on Windows after resolving a local Electron binary download/install issue (documented in Known Technical Debt). |
| 2026-07-10 | M1.2 complete — database connection module, migration runner, placeholder migration, wired into app startup, 15 unit tests. |
| 2026-07-10 | Post-M1.2 fix: bumped Node engine target to 22+ and `better-sqlite3` to v12 (Node 20 EOL / Node 24 prebuild gap); added `@electron/rebuild` with automatic `predev`/`prebuild`/`pretest` ABI-switching hooks to resolve an Electron-vs-Node native module mismatch. `architecture.md` §2 and `decisions.md` updated. |
| 2026-07-10 | M1.3 complete — core schema migration (all 7 tables + indexes), 15 integration tests including functional FK cascade-delete and unique-constraint verification. |
| 2026-07-10 | M1.4 complete — repository layer skeleton: one repository class per entity (7 total) with get/set-for-Settings and insert/find-for-the-rest per architecture.md's M1.4 spec, plus co-located row/domain types under `src/main/models/`. 36 unit tests. |
| 2026-07-10 | M1.5 complete — `SettingsService` wrapping `SettingsRepository`, with an encrypted NAS-password path via an injectable `ISafeStorage` (safeStorage-backed in production, faked in tests) and a hard guard preventing the password from ever going through the plaintext `get`/`set` path. 10 unit tests, including a raw-DB-bytes assertion that the stored NAS password is genuinely ciphertext. |
| 2026-07-10 | M1.6 complete — `LoggingService` (DB + console sink via injectable `IConsoleSink`, pino-backed in production) with a recursive `password`/`credential` redaction rule applied before persistence. Added `pino` as a new dependency. 19 unit tests, including explicit redaction-in-persisted-message coverage per the M1.6 Definition of Done. |
