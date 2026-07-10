# TV Series Manager — Technical Architecture

Status: Draft for approval — no implementation started
Based on: `TV_Series_Manager_SRS.txt` v1.0 + `decisions.md` (2026-07-10)

---

## 1. System Architecture

### 1.1 High-Level Architecture

This is a **single-process-pair desktop application**, not a client-server system. There is no network API surface for the app itself — "API Design" below refers to the internal contract between the Electron **main process** (backend) and the **renderer process** (frontend), not a network protocol.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Renderer Process                        │
│  React 18 + TypeScript + MUI                                    │
│  - Tabs: Monitor / Lookup / NAS Sync / Tools / Settings / Logs   │
│  - Zustand store (client-side UI state, mirrors backend state)  │
│  - No direct Node/fs/DB access (contextIsolation: true)         │
└───────────────────────────▲───────────────────────────────────┬─┘
                             │ ipcRenderer.invoke (request/response) │ webContents.send
                             │                                    │ (push events: progress, file changes)
┌───────────────────────────┴────────────────────────────────────▼─┐
│                          Preload Script                          │
│  contextBridge.exposeInMainWorld('api', {...typed methods})      │
└───────────────────────────▲───────────────────────────────────┬──┘
                             │ ipcMain.handle                     │ webContents.send
┌───────────────────────────┴────────────────────────────────────▼─┐
│                       Electron Main Process                      │
│  Node.js + TypeScript (strict)                                   │
│                                                                    │
│  ┌────────────┐ ┌───────────┐ ┌──────────────────┐               │
│  │File Monitor│→│  Parser   │→│ Processing Engine │──────┐        │
│  └────────────┘ └───────────┘ └──────────────────┘      │        │
│         │                              │                 │        │
│         │                       ┌──────▼───────┐  ┌──────▼─────┐  │
│         │                       │MKVToolNix Svc │  │Subtitle Svc│  │
│         │                       └───────────────┘  └────────────┘  │
│                                                                    │
│  ┌────────────┐  ┌────────────┐  ┌───────────┐  ┌──────────────┐  │
│  │Lookup Svc  │  │ NAS Service│  │Tools Svc  │  │Logging Svc   │  │
│  │+ Providers │  │            │  │           │  │              │  │
│  └────────────┘  └────────────┘  └───────────┘  └──────────────┘  │
│                                                                    │
│  ┌──────────────────────┐   ┌───────────────────────────────┐    │
│  │ Settings Service      │   │ Database Layer (Repositories) │    │
│  │ (config + safeStorage)│   │                                │    │
│  └──────────────────────┘   └───────────────┬───────────────┘    │
└──────────────────────────────────────────────┼────────────────────┘
                                                 │
                                        ┌────────▼────────┐
                                        │ SQLite (file)     │
                                        │ better-sqlite3     │
                                        └────────────────────┘
                     │                                    │
          ┌──────────▼─────────┐              ┌───────────▼───────────┐
          │ Windows File System │              │  External Processes    │
          │ Incoming/Converted/  │             │  mkvmerge/mkvextract   │
          │ Subtitles/Library    │             │  net use (NAS)         │
          └───────────────────────┘             │  WonderFox/MKVCleaver │
                                                 │  ssh.exe               │
                                                 └────────────────────────┘
```

### 1.2 Major Components

| Component | Layer | Responsibility |
|---|---|---|
| **Renderer / UI Shell** | Frontend | Tabs, dialogs, grids; talks only to the typed `window.api` bridge |
| **Preload Bridge** | Boundary | Whitelists exactly which IPC channels/methods are exposed to the renderer |
| **File Monitor** | Backend | chokidar watchers over Incoming/Converted/Subtitle folders; emits change events |
| **Parser** | Backend | Pure function(s): filename → `{series, season, episode}` per the `<seriesname>.SxxEyy.<release>` convention (decision #4) |
| **Processing Engine** | Backend | Orchestrates the move/rename/convert-preference/subtitle-match workflow; owns confirmation prompts |
| **MKVToolNix Service** | Backend | Wraps mkvmerge/mkvextract; owns the metadata cache |
| **Subtitle Service** | Backend | External subtitle discovery/matching/renaming (separate from MKV-embedded logic) |
| **Lookup Service + Providers** | Backend | `RLSBBProvider` behind a `LookupProvider` interface; episode-diff logic |
| **NAS Service** | Backend | Online detection, mount/unmount, compare, copy/move with verify-before-delete |
| **Tools Service** | Backend | Launch external apps, SSH session, workflow shortcuts |
| **Settings Service** | Backend | Typed config read/write over the `Settings` table + `safeStorage` for secrets |
| **Logging Service** | Backend | Structured logging to `Logs` table + optional file sink; consumed by everything |
| **Database Layer** | Backend | Repository classes per entity, migration runner, `better-sqlite3` connection |

### 1.3 How Components Communicate

- **Renderer ↔ Main:** exclusively through `ipcRenderer.invoke()` / `ipcMain.handle()` for request/response calls, and `webContents.send()` for main→renderer push events (progress updates, live file-monitor changes, NAS status changes). No `nodeIntegration` in the renderer; `contextIsolation: true`; `preload.ts` is the only bridge.
- **Main-process services ↔ each other:** plain TypeScript dependency injection (constructor injection via a lightweight composition root — no DI framework needed at this scale). Services depend on **interfaces**, not concrete classes, per SRS §5 Design Principles.
- **Main process ↔ external world:** `child_process.execFile`/`spawn` for `mkvmerge`/`mkvextract`/`net use`/`ssh`/external apps; `axios` for HTTP to the lookup site; `fs-extra` for filesystem operations; `better-sqlite3` (synchronous, offloaded to a worker where needed — see §7).

### 1.4 Data Flow (Representative Flows)

**Process Files flow:**
```
User clicks "Process Files"
→ Renderer invokes processing:run
→ Processing Engine reads current Monitor state (already parsed episodes)
→ For each episode: check Converted folder for matching filename (decision #1)
→ Check external subtitle by Series/Season/Episode identity
→ If missing, query MKVToolNix Service for embedded English tracks
→ If found, main sends processing:confirm-extract event → renderer shows dialog
→ Renderer invokes processing:confirm with user's choice
→ Processing Engine extracts (if chosen), moves video, moves/renames subtitle
→ Progress pushed via processing:progress events throughout
→ Logging Service records every step; Database updated (if applicable)
```

**Web Lookup flow:**
```
User clicks "Check for New Episodes"
→ Renderer invokes lookup:run
→ Lookup Service determines highest season locally present per series (decision #3)
→ For each managed series with lookupEnabled: RLSBBProvider.search() → parseResults()
→ Diff against highest local episode of highest local season
→ Persist to LookupHistory, push lookup:progress events
→ Renderer updates Lookup Results table
```

**NAS Sync flow:**
```
User clicks "Compare"
→ Renderer invokes nas:compare
→ NAS Service checks online status (cached, refreshed every N seconds)
→ If mounted: walk NAS Series folder, diff against local library
→ Return missing-files list to renderer
→ User clicks "Move Missing Files"
→ NAS Service: copy → verify (decision #2: verify success before any delete) → delete local → update table
→ Every copy logged to a sync log (see §4 — new SyncLog entity)
```

---

## 2. Technology Stack

| Layer | Choice | Notes |
|---|---|---|
| **Frontend** | React 18 + TypeScript (strict) + MUI v6 | Zustand for UI state store (lighter than Redux for this scope; swappable later) |
| **Backend** | Electron (main process) + Node.js 20 LTS + TypeScript (strict) | |
| **Database** | SQLite via `better-sqlite3` | Synchronous API; see §7 for how we avoid blocking the main thread |
| **Authentication** | **None (by design)** | Single-user, single-machine, unauthenticated desktop app — confirmed in decisions.md. The only "credential" is the NAS SMB login, not an app login. |
| **Storage** | SQLite file + Electron `userData` directory | Config, cache, logs all local; no cloud storage |
| **Secrets storage** | Electron `safeStorage` (falls back to Windows Credential Manager if needed) | NAS password only; never in SQLite plaintext |
| **Background jobs** | In-process async task queue (custom, sequential-with-progress) + `worker_threads` for heavy DB/file operations | No Redis/Bull — unnecessary for a single-machine app |
| **File watching** | `chokidar` | Incoming/Converted/Subtitle folders |
| **Internal "API"** | Typed Electron IPC (see §5) | Not REST/GraphQL — see justification in §5.1 |
| **External HTTP** | `axios` + `cheerio` | RLSBB scraping only; no other network calls |
| **Third-party integrations** | MKVToolNix (mkvmerge/mkvextract/mkvinfo/mkvpropedit via `child_process`), WonderFox HD Video Converter Factory Pro (launched, not scripted), MKVCleaver (launched, not scripted), Windows `net use` (NAS mount/unmount), `ssh.exe`/Windows Terminal | All isolated behind dedicated services per SRS §5 |
| **Deployment platform** | Windows desktop via Electron Builder | NSIS installer + portable `.exe`; no auto-update server planned for v1 |
| **Testing** | Vitest + React Testing Library + Playwright (Electron mode) | See §8 |
| **Lint/Format** | ESLint (strict TS config) + Prettier | Enforced via CI/pre-commit hook |

---

## 3. Project Structure

### 3.1 Folder Structure

```
tv-series-manager/
├── src/
│   ├── main/
│   │   ├── app/                    # Electron app lifecycle, window creation, composition root
│   │   ├── ipc/                    # ipcMain.handle registrations, grouped by domain
│   │   ├── monitor/                # FileMonitorService (chokidar wrapper)
│   │   ├── parser/                 # ParserService (pure logic)
│   │   ├── processing/             # ProcessingEngine, ProcessingQueue
│   │   ├── mkv/                    # MKVToolNixService, metadata cache
│   │   ├── subtitles/              # SubtitleService (external subtitle matching/rename)
│   │   ├── lookup/
│   │   │   └── providers/          # LookupProvider interface + RLSBBProvider
│   │   ├── nas/                    # NASService (status, mount, compare, copy/move, verify)
│   │   ├── tools/                  # ToolsService (external app launch, SSH, shortcuts)
│   │   ├── settings/               # SettingsService (typed config + safeStorage)
│   │   ├── logging/                # LoggingService (Pino + DB sink)
│   │   ├── database/
│   │   │   ├── migrations/         # Numbered migration files
│   │   │   ├── repositories/       # One repository class per entity
│   │   │   └── connection.ts
│   │   └── models/                 # Shared domain types (Episode, SeriesEntry, etc.)
│   ├── renderer/
│   │   ├── components/             # Reusable presentational components
│   │   ├── pages/                  # One per tab: Monitor, Lookup, NasSync, Tools, Settings, Logs
│   │   ├── dialogs/                # MediaInfoDialog, SubtitleDetailsDialog, ConfirmDialog, etc.
│   │   ├── hooks/                  # useIpc, useProgress, etc.
│   │   ├── store/                  # Zustand slices
│   │   ├── styles/
│   │   └── assets/
│   ├── preload/
│   │   └── index.ts                # contextBridge exposure, typed to match main/ipc contracts
│   └── shared/
│       ├── ipc-contracts/          # Request/response types shared by main + renderer + preload
│       ├── errors/                 # Typed error codes/classes
│       └── constants/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── TV_Series_Manager_SRS.txt
│   ├── decisions.md
│   ├── architecture.md
│   ├── database.md
│   └── api.md
├── electron-builder.yml
├── vitest.config.ts
├── playwright.config.ts
├── tsconfig.json (+ tsconfig.main.json / tsconfig.renderer.json)
├── .eslintrc.cjs
└── package.json
```

### 3.2 Module Organization Principles

- One **service class per bounded responsibility**, matching the SRS's module list exactly (no god-services).
- Every service exposes an **interface** (`IParserService`, `INASService`, etc.) in `models/` or alongside the service; consumers depend on the interface.
- `ipc/` is the only place `ipcMain.handle` is called — services themselves have no Electron/IPC awareness, so they stay unit-testable in isolation and reusable if the app ever needs a CLI or test harness.
- `shared/ipc-contracts/` holds the request/response TypeScript types used by **both** main and renderer, so the preload bridge and `ipcMain.handle` signatures can never silently drift apart.

### 3.3 Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Files (services/classes) | `PascalCase.ts` | `ProcessingEngine.ts` |
| Files (React components) | `PascalCase.tsx` | `MonitorGrid.tsx` |
| Files (hooks/utilities) | `camelCase.ts` | `useIpc.ts` |
| Interfaces | `I` prefix | `INASService` |
| IPC channel names | `domain:action` | `processing:run`, `nas:compare`, `lookup:progress` |
| SQLite tables | `PascalCase` (matches SRS) | `ManagedSeries` |
| SQLite columns | `camelCase` (matches SRS) | `normalizedName` |
| Error codes | `SCREAMING_SNAKE_CASE` | `NAS_OFFLINE`, `MKVTOOLNIX_MISSING` |
| Test files | `*.test.ts` colocated or in `tests/` mirroring `src/` | `ParserService.test.ts` |

### 3.4 Coding Standards

- TypeScript **strict mode**, `noImplicitAny`, `noUncheckedIndexedAccess` on.
- ESLint with `@typescript-eslint/recommended-requiring-type-checking` + import-order + no-floating-promises rules (critical for an async-heavy app).
- No default exports for services/classes (named exports only) — improves refactor safety and IDE navigation.
- Constructor-based dependency injection; no service reaches for a global singleton.
- All I/O-returning functions are `async`/return `Promise` — no sync `fs` calls outside narrowly justified, documented exceptions.
- Every public service method has a documented error contract (which typed errors it can throw/return).
- Commit convention: Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`) to keep history and future changelogs clean.

---

## 4. Database Design

### 4.1 Entities

Carried over from SRS §8, **plus one addition** flagged during this design pass: SRS §17.11 requires per-file NAS sync logging (timestamp, source, destination, duration, verification result), but the original §8 schema has no table for it — `Logs` is a general app log, not structured sync history. Adding `SyncLog` closes that gap.

| Table | Purpose |
|---|---|
| `Settings` | Key/value app configuration |
| `ManagedSeries` | Series tracked for Web Lookup |
| `LookupHistory` | Per-lookup-run results per series |
| `MKVMetadata` | Cached mkvmerge JSON output |
| `Logs` | General structured application log |
| `ToolConfiguration` | External tool executable paths |
| **`SyncLog`** *(new)* | Per-file NAS copy/move history for audit purposes |

### 4.2 Schema, Relationships, Keys

```sql
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

-- NEW: closes the SRS §17.11 sync-logging gap
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
```

**Relationships:**
- `LookupHistory.seriesId → ManagedSeries.id` (many-to-one, cascade delete — removing a managed series removes its lookup history).
- `MKVMetadata`, `Logs`, `ToolConfiguration`, `SyncLog` are standalone (no FKs) — they key off filesystem paths or are independent audit trails.

**Indexing rationale:**
- `ManagedSeries.normalizedName` unique index — lookups and duplicate-add checks are name-driven.
- `MKVMetadata.fullPath` unique index — this is the cache lookup key (combined with size/modified check in application logic, per SRS §15.4).
- `LookupHistory.seriesId` and `.lookupDate` — supports "latest result per series" and history browsing without full scans.
- `Logs.timestamp`/`.level` — the Logs tab's search/filter (SRS §21) needs both.
- `SyncLog.timestamp` — audit browsing; this table is the durable record backing SRS §17.11.

### 4.3 Migrations

- A `schema_migrations` table (`version INTEGER PRIMARY KEY`, `appliedAt DATETIME`) tracks applied migrations.
- Migrations are numbered SQL or TS files in `src/main/database/migrations/`, applied in order at startup inside a transaction; app refuses to start if a migration fails (fail loud, not silently continue with a mismatched schema).

Full column-by-column detail, migration file conventions, and future schema evolution notes will move into `database.md` when that document is created (per decisions.md).

---

## 5. API Design

### 5.1 REST or GraphQL Justification

**Neither REST nor GraphQL applies here.** This is a single-machine Electron desktop app with no client-server network boundary — the "API" is the **IPC contract** between the renderer and main process. Introducing an HTTP/GraphQL layer would add a network stack, serialization overhead, and an unnecessary attack surface for zero benefit, since both processes run locally under the same OS user. The equivalent architectural decisions (endpoint list, request/response shape, error handling, auth flow) are addressed below in IPC terms.

If a future extension requires remote access (e.g., a companion mobile app, per SRS §27 future extensions), that would warrant introducing a local HTTP/REST server at that time — call this out explicitly as a **non-goal for v1**.

### 5.2 IPC "Endpoint" List

Channels follow `domain:action` naming. All are `ipcMain.handle` (request/response) unless marked `[event]` (main→renderer push, no response expected).

| Channel | Direction | Purpose |
|---|---|---|
| `settings:get` / `settings:set` | invoke | Read/write config values |
| `monitor:getState` | invoke | Current Incoming view snapshot |
| `monitor:fileChanged` [event] | push | Add/remove/rename notifications |
| `monitor:refresh` | invoke | Force full rescan |
| `mkv:inspect` | invoke | Inspect a single file (cache-aware) |
| `mkv:extractSubtitle` | invoke | Extract one track |
| `mkv:extractEnglishSubtitles` | invoke | Extract all/preferred English tracks for a file |
| `mkv:extractBatch` | invoke | Batch extraction across displayed files |
| `mkv:extractBatch:progress` [event] | push | Batch extraction progress |
| `mkv:validateInstallation` | invoke | Startup + Tools-page validation |
| `processing:run` | invoke | Start batch processing |
| `processing:confirmExtract` [event → invoke pair] | push then invoke | Prompts user, awaits `processing:confirm` |
| `processing:progress` [event] | push | Current file/operation/progress |
| `processing:cancel` | invoke | Cancel remaining batch items |
| `lookup:listSeries` / `lookup:addSeries` / `lookup:removeSeries` / `lookup:renameSeries` / `lookup:setEnabled` | invoke | Managed series CRUD |
| `lookup:run` | invoke | Run lookup for all enabled series |
| `lookup:progress` [event] | push | Per-series lookup progress |
| `lookup:openSearch` | invoke | Open generated URL in default browser |
| `nas:getStatus` | invoke | Current online/offline/checking state |
| `nas:statusChanged` [event] | push | Status transitions |
| `nas:mount` / `nas:unmount` | invoke | `net use` operations |
| `nas:compare` | invoke | Returns missing-files list |
| `nas:copyMissing` / `nas:moveMissing` | invoke | Bulk copy/move |
| `nas:syncProgress` [event] | push | Current file/speed/elapsed |
| `tools:launch` | invoke | Launch a configured external app |
| `tools:openFolder` | invoke | Open a folder in Explorer |
| `tools:openSSH` | invoke | Launch SSH session |
| `tools:testInstallation` | invoke | Verify an executable |
| `logs:query` | invoke | Search/filter Logs table |
| `logs:export` | invoke | Export to file |
| `logs:clear` | invoke | Clear log table |

### 5.3 Request/Response Format

Every `invoke` channel uses a consistent envelope, defined once in `shared/ipc-contracts/`:

```typescript
type IpcResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: ErrorCode; message: string; details?: unknown } };
```

Example (`processing:run`):

```typescript
// Request
interface ProcessingRunRequest {
  episodeIds: string[];   // subset of currently detected episodes, or 'all'
}

// Response
type ProcessingRunResponse = IpcResult<{
  batchId: string;
  queuedCount: number;
}>;
```

Push events use a similarly typed but response-less payload, e.g.:

```typescript
interface ProcessingProgressEvent {
  batchId: string;
  currentFile: string;
  completed: number;
  total: number;
  etaSeconds?: number;
}
```

### 5.4 "Authentication" Flow

There is no application-level authentication. The only credential flow in the system is:

```
User enters NAS username/password in Settings
→ settings:set('nasCredentials', ...) → SettingsService encrypts via safeStorage
→ Encrypted blob stored in Settings table (value column holds ciphertext, never plaintext)
→ On nas:mount, SettingsService decrypts in-memory only, passes to `net use` invocation
→ Decrypted value never logged, never sent to renderer, never persisted unencrypted
```

### 5.5 Error Handling Standards

- All errors crossing the IPC boundary are converted to the typed `ErrorCode` enum (e.g., `NAS_OFFLINE`, `MKVTOOLNIX_MISSING`, `FILE_NOT_FOUND`, `PERMISSION_DENIED`, `VERIFICATION_FAILED`, `PARSE_AMBIGUOUS`) — never raw `Error` objects or stack traces sent to the renderer.
- Every error is logged via LoggingService **before** being returned to the renderer, with full internal detail (stack trace, context) — the renderer only ever sees the sanitized `{code, message}`.
- Per SRS §15.15/§16.5/§17.8/FR-206: failures on one item in a batch are caught, logged, and recorded as `FAILED` for that item **without throwing** out of the batch loop — the batch's overall `invoke` call still resolves successfully with a per-item results array.

Full endpoint-by-endpoint request/response typing will move into `api.md` when that document is created.

---

## 6. Security Architecture

| Concern | Approach |
|---|---|
| **Authentication** | None at app level (single OS-level user boundary is the trust boundary) — documented as an explicit decision, not an oversight. |
| **Authorization** | Not applicable within the app (no roles). OS file permissions gate what the app can read/write. NAS access is authorized by the SMB credential, handled as a secret (below). |
| **Data protection** | NAS password encrypted via Electron `safeStorage` (DPAPI-backed on Windows) before ever touching SQLite. All other config is non-sensitive and stored plain in `Settings`. |
| **Input validation** | All IPC request payloads validated with `zod` schemas at the `ipc/` boundary before reaching any service — rejects malformed requests before they can, e.g., be used to construct a filesystem path. |
| **Secrets management** | Only the NAS password is a secret; retrieved decrypted only in-memory, only within `NASService`, only for the duration of a `net use` call; never logged (LoggingService has an explicit redaction rule for any field named `password`/`credential`). |
| **Path traversal prevention** | All user-configurable paths (Incoming/Converted/Subtitle/Library) are resolved and validated (`path.resolve` + containment checks where applicable) before any filesystem operation; destination filenames are derived from parsed/sanitized values, never raw user/network input, before being used in a `fs` call. |
| **HTML escaping** | React handles this by default for rendered content; explicitly avoid `dangerouslySetInnerHTML` anywhere results from the RLSBB scraper are displayed. |
| **Electron hardening** | `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` where feasible, no `remote` module, CSP meta tag restricting script sources in the renderer's `index.html`. |
| **Audit logging** | `Logs` table covers general operational audit trail (SRS §21); new `SyncLog` table (§4 above) specifically satisfies the "every copied file" audit requirement in SRS §17.11 — together these cover every destructive/confirmable action required by SRS §7 FR-007. |
| **Third-party process execution** | All `child_process` invocations (`mkvmerge`, `mkvextract`, `net use`, external tool launches, `ssh`) use `execFile`/`spawn` with an argument array — **never** a shell string — to eliminate command-injection risk from filenames containing special characters. |

---

## 7. Scalability Considerations

This is a **single-machine, single-user desktop app** — "scalability" here means staying responsive at the stated data volumes (SRS §23: 20,000+ files), not horizontal scale-out.

- **Expected bottlenecks:**
  - `better-sqlite3` is synchronous; large queries (e.g., full-library scans against 20k rows) run on the main thread and can freeze the UI if not managed.
  - `chokidar` watching folders with thousands of files can emit large event bursts, especially during a batch move operation the app itself just performed.
  - Full NAS `compare` walking both a large local tree and a remote SMB share can be slow over a real network link.

- **Mitigations:**
  - Route heavy DB reads (large `MKVMetadata`/library scans) and the NAS compare walk through a Node `worker_thread`, keeping the main process's IPC responsiveness intact — this directly serves the "UI always responsive" and "20,000 files without blocking" requirements (SRS §23).
  - Debounce/batch chokidar events (e.g., 250ms window) before pushing `monitor:fileChanged` to the renderer, and have the Processing Engine temporarily pause "reactive" monitor updates for paths it is itself currently writing to, to avoid feedback loops.
  - Paginate/virtualize the Incoming and NAS-compare grids in the renderer (MUI `DataGrid` virtualization) rather than rendering 20k rows at once.

- **Caching strategy:**
  - `MKVMetadata` table already serves as a persistent cache keyed by path+size+modified (SRS §15.4) — this is the primary cache and should have a defined max-age/pruning policy for entries whose file no longer exists on disk.
  - Add a small in-memory LRU cache in front of the Parser for recently-parsed filenames during a single monitor session, since the same folder is re-scanned on every "Refresh."

- **Queueing/background processing:**
  - A single **in-process sequential task queue** (not a distributed queue — unnecessary here) drives Processing Engine batches, MKV batch extraction, and NAS copy/move operations, each reporting progress via IPC events. Sequential-by-default keeps disk I/O predictable and progress reporting simple; consider limited parallelism (e.g., 2 concurrent file operations) only after profiling shows it's worth the added complexity.

- **Horizontal scaling approach:** **Not applicable.** This is explicitly a single-machine desktop tool (confirmed non-goal in SRS §1.3 and the decisions log). This should be stated plainly in the architecture so nobody designs for multi-instance coordination that will never be needed for v1.

---

## 8. Testing Strategy

| Level | Tooling | Scope |
|---|---|---|
| **Unit** | Vitest | Parser (exhaustive filename corpus against the `<seriesname>.SxxEyy.<release>` convention), Processing Engine decision logic (converted-file matching, confirmation branching), Lookup URL builder + HTML parser (against saved fixture HTML, not live network), MKVToolNixService JSON-parsing logic (mocked `child_process` output), NAS verification logic, all Repository classes (against an in-memory/temp SQLite DB) |
| **Integration** | Vitest + real temp filesystem + temp SQLite file | File Monitor → Parser → Processing Engine end-to-end against a scratch folder tree; MKVToolNixService against real `mkvmerge`/`mkvextract` binaries with small sample MKVs (CI must have MKVToolNix installed, or these are skipped/marked); migration runner applying the full migration chain to a fresh DB |
| **End-to-end** | Playwright (Electron driver) | Full app launch → Monitor tab shows seeded fixture files → Process Files → confirm dialog → verify files land in the right library folder; Settings persistence across app restart; NAS flow against a mocked `net use`/SMB layer (no real NAS in CI) |
| **Performance** | Custom Vitest benchmark script + Playwright timing assertions | Synthetic 20,000-file library fixture; assert startup < 3s, refresh < 2s, MKVMetadata cache-hit read < 100ms, per SRS §23 targets — run in CI on a schedule (not every commit, to keep PR feedback fast) |

**Coverage target:** 80%+ overall (SRS §25), enforced via CI gate, with unit tests on Parser/Processing Engine/NAS verification logic held to a stricter bar given their correctness-critical, data-loss-adjacent nature.

---

## 9. Development Roadmap — Milestones & Session-Sized Tasks

Each task is scoped to be completable in one focused development session (roughly 2–4 hours). Tasks within a milestone are ordered; cross-milestone dependencies are called out explicitly.

### Milestone 1 — Foundation

**M1.1 — Project scaffold**
- *Objective:* Initialize Electron + React + TS project with the folder structure from §3.1; wire up `electron-builder`, ESLint/Prettier, Vitest config.
- *Files:* `package.json`, `tsconfig*.json`, `.eslintrc.cjs`, `electron-builder.yml`, `vitest.config.ts`, `src/main/app/`, `src/renderer/` skeleton, `src/preload/index.ts`
- *Dependencies:* none
- *Acceptance criteria:* `npm run dev` launches an empty Electron window rendering a placeholder React app; lint/typecheck/test scripts run clean on an empty codebase.
- *Definition of Done:* CI pipeline (or local scripts) runs lint + typecheck + test successfully; committed with a `feat:` message.

**M1.2 — Database connection + migration runner**
- *Objective:* Implement `better-sqlite3` connection module, `schema_migrations` table, migration file loader/runner.
- *Files:* `src/main/database/connection.ts`, `src/main/database/migrations/0001_init.sql` (empty/no-op placeholder), migration runner logic
- *Dependencies:* M1.1
- *Acceptance criteria:* App startup creates the DB file in the correct `userData` location if absent; running twice is idempotent; a deliberately failing migration halts startup with a clear logged error.
- *Definition of Done:* Unit test covers "apply migrations to fresh DB" and "re-apply is no-op."

**M1.3 — Core schema migration**
- *Objective:* Write migration(s) creating all tables from §4.2 (including `SyncLog`).
- *Files:* `src/main/database/migrations/0002_core_schema.sql`
- *Dependencies:* M1.2
- *Acceptance criteria:* Fresh DB has all 7 tables with the exact columns/indexes specified in §4.2.
- *Definition of Done:* Integration test asserts table/index existence via `PRAGMA` queries.

**M1.4 — Repository layer skeleton**
- *Objective:* One repository class per entity with basic CRUD (get/set for Settings; insert/find for the rest).
- *Files:* `src/main/database/repositories/*.ts`
- *Dependencies:* M1.3
- *Acceptance criteria:* Each repository has typed methods matching its table's columns; no raw SQL leaks outside the repository layer.
- *Definition of Done:* Unit tests per repository against a temp DB file, covering create/read at minimum.

**M1.5 — Settings Service + safeStorage integration**
- *Objective:* Typed `SettingsService` wrapping `SettingsRepository`, with a dedicated encrypted path for NAS credentials via `safeStorage`.
- *Files:* `src/main/settings/SettingsService.ts`, `src/main/settings/ISettingsService.ts`
- *Dependencies:* M1.4
- *Acceptance criteria:* Non-secret values round-trip as plaintext; NAS password round-trips only via `safeStorage.encryptString/decryptString`, never appears in the DB as plaintext (test asserts on raw DB bytes).
- *Definition of Done:* Unit test confirms encrypted-at-rest behavior explicitly.

**M1.6 — Logging Service**
- *Objective:* `LoggingService` writing to `Logs` table + console (dev) sink, with the password-redaction rule from §6.
- *Files:* `src/main/logging/LoggingService.ts`
- *Dependencies:* M1.4
- *Acceptance criteria:* Log entries persist with correct level/source/timestamp; a test log call including a `password` field is redacted in the persisted message.
- *Definition of Done:* Unit test for redaction behavior specifically (this is a security-relevant guarantee, not just a feature).

**M1.7 — IPC contract scaffolding + shared error types**
- *Objective:* Establish `shared/ipc-contracts/` structure, `IpcResult<T>` type, `ErrorCode` enum, and the `zod`-validated `ipc/` handler registration pattern with one working example channel (`settings:get`/`settings:set`).
- *Files:* `src/shared/ipc-contracts/*.ts`, `src/shared/errors/ErrorCode.ts`, `src/main/ipc/settingsHandlers.ts`, `src/preload/index.ts` (updated)
- *Dependencies:* M1.5
- *Acceptance criteria:* Renderer can call `window.api.settings.get('theme')` end-to-end and get a typed, validated response.
- *Definition of Done:* One E2E-style Playwright smoke test confirms the round trip through a real Electron window.

**M1.8 — Empty tab shell UI**
- *Objective:* Renderer shell with the six tabs (Monitor/Lookup/NAS Sync/Tools/Settings/Logs) as empty MUI pages, Zustand store skeleton.
- *Files:* `src/renderer/pages/*.tsx`, `src/renderer/store/*.ts`, `src/renderer/App.tsx`
- *Dependencies:* M1.1
- *Acceptance criteria:* All six tabs are navigable and render without console errors.
- *Definition of Done:* Basic RTL smoke test per page component.

---

### Milestone 2 — Parser + File Monitor

**M2.1 — Parser: filename corpus + pure parsing function**
- *Objective:* Implement parsing strictly for `<seriesname>.SxxEyy.<release>.mkv` (decision #4), with a test corpus covering real-world variants of that specific pattern (varying release-tag noise, dot vs. space in series name pre-normalization, etc.).
- *Files:* `src/main/parser/ParserService.ts`, `src/main/parser/IParserService.ts`, `tests/unit/parser/filenames.fixture.ts`
- *Dependencies:* M1.1
- *Acceptance criteria:* 100% of the fixture corpus parses correctly; any filename outside the supported convention returns a typed "unparseable" result rather than throwing or guessing.
- *Definition of Done:* Unit tests green; corpus has at least 25 real-world-style example filenames.

**M2.2 — Folder-name generator**
- *Objective:* Implement the destination folder naming rules from SRS §12 (lowercase, spaces→dots, dedupe/trim dots, preserve season suffix).
- *Files:* `src/main/parser/FolderNameGenerator.ts`
- *Dependencies:* M2.1
- *Acceptance criteria:* Matches all SRS §12 examples exactly.
- *Definition of Done:* Unit tests cover each documented example plus at least 3 edge cases (double spaces, trailing punctuation).

**M2.3 — File Monitor service (chokidar wrapper)**
- *Objective:* Watch Incoming/Converted/Subtitle folders per configured Settings paths; debounce and emit typed add/remove/rename events.
- *Files:* `src/main/monitor/FileMonitorService.ts`, `src/main/monitor/IFileMonitorService.ts`
- *Dependencies:* M1.5 (paths from Settings), M1.1
- *Acceptance criteria:* Adding/removing/renaming a file in a temp watched folder produces exactly one correctly-typed event within the debounce window.
- *Definition of Done:* Integration test against a real temp directory.

**M2.4 — Monitor IPC + live Incoming grid**
- *Objective:* Wire `monitor:getState`, `monitor:fileChanged` [event], `monitor:refresh` through IPC; render the Incoming grid (SRS §10 columns) with parsed data, using virtualization.
- *Files:* `src/main/ipc/monitorHandlers.ts`, `src/renderer/pages/MonitorPage.tsx`, `src/renderer/components/MonitorGrid.tsx`
- *Dependencies:* M2.1, M2.3, M1.7
- *Acceptance criteria:* Dropping a correctly-named file into a (test) Incoming folder makes it appear in the grid without a manual refresh.
- *Definition of Done:* Playwright E2E test covers this live-update scenario.

---

### Milestone 3 — MKVToolNix Integration

**M3.1 — MKVToolNixService: inspection + JSON parsing**
- *Objective:* Wrap `mkvmerge -i -F json`, parse into typed models (video/audio/subtitle tracks), never parse console text.
- *Files:* `src/main/mkv/MKVToolNixService.ts`, `src/main/mkv/IMKVToolNixService.ts`, `src/main/models/MediaTrack.ts`
- *Dependencies:* M1.6 (logging), M1.4
- *Acceptance criteria:* Given fixture `mkvmerge` JSON output (mocked `child_process`), correctly extracts video/audio/subtitle track lists including English-detection per FR-202's tag list.
- *Definition of Done:* Unit tests using fixture JSON only (no real MKVToolNix dependency at this stage).

**M3.2 — Metadata cache (path+size+modified)**
- *Objective:* Implement cache-check-before-invoke logic against `MKVMetadata` table, with invalidation on file change (FR-201).
- *Files:* `src/main/mkv/MetadataCache.ts`
- *Dependencies:* M3.1, M1.4
- *Acceptance criteria:* Second inspection of an unchanged file does not re-invoke `mkvmerge`; touching the file (changed mtime/size) does.
- *Definition of Done:* Unit test with mocked `child_process` call counting.

**M3.3 — Startup validation + Tools-page MKVToolNix status (FR-200)**
- *Objective:* `validateInstallation()` checking all 4 executables; Tools page display of ✓/✗ per executable with version/location.
- *Files:* `src/main/mkv/MKVToolNixService.ts` (extend), `src/renderer/pages/ToolsPage.tsx` (MKVToolNix card)
- *Dependencies:* M3.1
- *Acceptance criteria:* With a mocked "missing executable" path, the rest of the app remains fully functional (per SRS §15 Overview requirement that MKVToolNix is optional).
- *Definition of Done:* Integration test confirms app doesn't crash/degrade other features when MKVToolNix path is invalid.

**M3.4 — Media Information Dialog**
- *Objective:* Double-click-triggered dialog with General/Video/Audio/Subtitles/Container tabs per SRS §15.5.
- *Files:* `src/renderer/dialogs/MediaInfoDialog.tsx`, `src/main/ipc/mkvHandlers.ts` (`mkv:inspect`)
- *Dependencies:* M3.1, M2.4
- *Acceptance criteria:* Opens with correct data for a fixture file; gracefully shows an empty/error state if inspection fails.
- *Definition of Done:* RTL test with mocked IPC response.

**M3.5 — Incoming view "Embedded English"/"Audio" columns + tooltips**
- *Objective:* Extend Monitor grid with the two columns and hover tooltips per SRS §15.7.
- *Files:* `src/renderer/components/MonitorGrid.tsx` (extend)
- *Dependencies:* M3.1, M2.4
- *Acceptance criteria:* Matches the SRS §15.7 example table exactly for fixture data (None/1 Track/3 Tracks display).
- *Definition of Done:* RTL test covering all three display states.

**M3.6 — Single + batch subtitle extraction**
- *Objective:* `extractSubtitleTrack`, `extractEnglishSubtitles`, deterministic filename generation (FR-204/205), `extractBatch` with progress events, error-tolerant batch loop (FR-206).
- *Files:* `src/main/mkv/MKVToolNixService.ts` (extend), `src/main/ipc/mkvHandlers.ts` (extend)
- *Dependencies:* M3.1, M3.2
- *Acceptance criteria:* One-English-track file → `VideoName.srt`; multi-track file → correctly suffixed filenames per FR-205 examples; a forced failure on one file in a batch doesn't stop the rest.
- *Definition of Done:* Unit tests for naming logic + integration test for batch error tolerance.

**M3.7 — Subtitle Details Dialog**
- *Objective:* Toolbar (Refresh/Extract Selected/Extract All English/Copy Metadata/Export JSON) + track table per SRS §15.8.
- *Files:* `src/renderer/dialogs/SubtitleDetailsDialog.tsx`
- *Dependencies:* M3.6
- *Acceptance criteria:* All toolbar actions wired to correct IPC calls; export produces a valid JSON file.
- *Definition of Done:* RTL test per toolbar action.

---

### Milestone 4 — Processing Engine (critical path — highest test investment)

**M4.1 — Converted-file matching (decision #1: filename-based)**
- *Objective:* Given an Incoming file, determine if a same-filename match exists in the Converted folder.
- *Files:* `src/main/processing/ConvertedFileMatcher.ts`
- *Dependencies:* M2.3
- *Acceptance criteria:* Exact and near-exact (extension-only-difference) filename matches are found; non-matches correctly return "not found."
- *Definition of Done:* Unit tests covering match/no-match/extension-difference cases.

**M4.2 — Subtitle Service: external subtitle matching + rename**
- *Objective:* Match external subtitles by Series/Season/Episode identity (SRS §14), rename-on-move logic.
- *Files:* `src/main/subtitles/SubtitleService.ts`, `src/main/subtitles/ISubtitleService.ts`
- *Dependencies:* M2.1
- *Acceptance criteria:* Subtitle with a differently-formatted filename but matching S/E identity is correctly matched; rename output matches the video's final filename exactly.
- *Definition of Done:* Unit tests covering the SRS §14 rename example.

**M4.3 — Processing Engine: single-episode step sequence**
- *Objective:* Implement Steps 1–7 from SRS §13 for one episode: destination folder resolution/creation, converted-vs-incoming selection, subtitle search, MKV inspection fallback, move+rename.
- *Files:* `src/main/processing/ProcessingEngine.ts`, `src/main/processing/IProcessingEngine.ts`
- *Dependencies:* M4.1, M4.2, M3.1, M2.2
- *Acceptance criteria:* Given a fixture folder tree, a single episode processes end-to-end into the correct library folder with correct filenames, matching all SRS §13 Acceptance Criteria for the single-item case.
- *Definition of Done:* Integration test against a real temp filesystem tree.

**M4.4 — Confirmation dialog flow (extract-before-move prompt)**
- *Objective:* Implement the "External subtitle not found, embedded English available — Extract/Skip/Cancel" flow (SRS §13 Step 6, §15.11) as a main↔renderer round trip that pauses processing mid-batch.
- *Files:* `src/main/processing/ProcessingEngine.ts` (extend), `src/renderer/dialogs/ExtractConfirmDialog.tsx`, `src/main/ipc/processingHandlers.ts`
- *Dependencies:* M4.3, M3.6
- *Acceptance criteria:* Processing correctly pauses awaiting user input and resumes with the chosen action; "Cancel" aborts only the current item, not already-queued-complete ones.
- *Definition of Done:* E2E test simulating each of Extract/Skip/Cancel.

**M4.5 — Existing-subtitle conflict dialog + multi-subtitle selection dialog**
- *Objective:* Overwrite/Replace/Skip prompt (SRS §14) and multi-English-variant selection dialog (SRS §14 "Multiple Subtitles").
- *Files:* `src/renderer/dialogs/SubtitleConflictDialog.tsx`, `src/renderer/dialogs/SubtitleSelectionDialog.tsx`
- *Dependencies:* M4.4
- *Acceptance criteria:* Each dialog's outcome correctly drives ProcessingEngine's next action.
- *Definition of Done:* RTL tests per dialog + integration test for at least one full path through each.

**M4.6 — Batch processing across multiple series + progress/cancellation**
- *Objective:* Extend Processing Engine to loop over all detected series (SRS §13 Batch Processing example), with a progress dialog (current file/progress/ETA/current operation) and mid-batch cancellation that lets the current item finish.
- *Files:* `src/main/processing/ProcessingQueue.ts`, `src/renderer/dialogs/ProcessingProgressDialog.tsx`
- *Dependencies:* M4.3, M4.4
- *Acceptance criteria:* Fixture tree with 4 series (mirroring the SRS example) all process correctly in one run; cancel mid-batch stops remaining items but leaves the in-flight one intact.
- *Definition of Done:* E2E test replicating the SRS §13 four-series batch example.

---

### Milestone 5 — Tools Page (quick win — good milestone to interleave with M4 if resourcing allows)

**M5.1 — Tools Service: external app launch + verification (FR-500)**
- *Objective:* Launch/Browse/Open Folder/Restore Default/Status for MKVCleaver and WonderFox.
- *Files:* `src/main/tools/ToolsService.ts`, `src/renderer/pages/ToolsPage.tsx` (extend)
- *Dependencies:* M1.5
- *Acceptance criteria:* Launch fails gracefully with the exact "Executable not found" message (FR-500) when misconfigured.
- *Definition of Done:* Unit test for the verify-before-launch check; RTL test for the card UI states.

**M5.2 — SSH launcher**
- *Objective:* `Open SSH Session` button, default `ssh admin@<nasIp>`, Windows Terminal/default terminal launch, OpenSSH-missing fallback message.
- *Files:* `src/main/tools/ToolsService.ts` (extend)
- *Dependencies:* M5.1
- *Acceptance criteria:* Correct command constructed from Settings NAS IP; missing-OpenSSH case shows the specified message rather than a raw error.
- *Definition of Done:* Unit test with mocked `child_process`/`which` check.

**M5.3 — Workflow shortcuts + "Open All Local Folders"**
- *Objective:* Per-folder Explorer shortcuts; bulk "open all," skipping unavailable folders without cancelling the rest.
- *Files:* `src/main/tools/ToolsService.ts` (extend), `src/renderer/pages/ToolsPage.tsx` (extend)
- *Dependencies:* M5.1
- *Acceptance criteria:* One missing folder among four doesn't prevent the other three from opening.
- *Definition of Done:* Unit test for the skip-on-missing behavior.

---

### Milestone 6 — NAS Sync

**M6.1 — NAS Service: online/offline detection + status polling**
- *Objective:* Configurable-interval availability check (default per Settings), status bar indicator states (Online/Offline/Checking/Unknown), tooltip with IP/Drive/Mounted/Last Check/Last Success.
- *Files:* `src/main/nas/NASService.ts`, `src/main/nas/INASService.ts`, `src/renderer/components/NasStatusIndicator.tsx`
- *Dependencies:* M1.5
- *Acceptance criteria:* Status transitions correctly through all 4 states against a mocked network layer.
- *Definition of Done:* Unit tests per state transition.

**M6.2 — Mount/Unmount**
- *Objective:* `net use` wrapper via `execFile` (array args, per §6 security note — never shell string), credential retrieval via SettingsService, mount-button disabled-while-mounting state.
- *Files:* `src/main/nas/NASService.ts` (extend)
- *Dependencies:* M6.1, M1.5
- *Acceptance criteria:* Mount/unmount invoked with correctly-formed arguments (asserted via mocked `execFile` call args, not a real NAS); credential never appears in any log output.
- *Definition of Done:* Unit test asserting on both command construction and the log-redaction guarantee from M1.6.

**M6.3 — Compare**
- *Objective:* Walk local library + NAS share, return only locally-present/NAS-missing files (FR-401).
- *Files:* `src/main/nas/NASService.ts` (extend), `src/renderer/pages/NasSyncPage.tsx`
- *Dependencies:* M6.2
- *Acceptance criteria:* Fixture trees with partial overlap return exactly the expected missing-file set; existing NAS-only files never appear.
- *Definition of Done:* Integration test against two temp directory trees standing in for local/NAS.

**M6.4 — Copy Missing Files**
- *Objective:* Copy every displayed file, never overwrite, progress reporting (current file/remaining/speed/elapsed).
- *Files:* `src/main/nas/NASService.ts` (extend)
- *Dependencies:* M6.3
- *Acceptance criteria:* Pre-existing destination file is never overwritten; progress events fire correctly.
- *Definition of Done:* Integration test asserting destination file content is untouched when a conflicting file already exists.

**M6.5 — Move Missing Files (copy → verify → delete)**
- *Objective:* Implement decision #2 precisely: local delete only occurs after verified-successful copy. Pin the verification method (recommend SHA-256 hash comparison, per the risk noted in the SRS analysis) and log every operation to the new `SyncLog` table.
- *Files:* `src/main/nas/NASService.ts` (extend), `src/main/nas/FileVerifier.ts`, `src/main/database/repositories/SyncLogRepository.ts`
- *Dependencies:* M6.4, M1.4 (SyncLogRepository), M1.3 (SyncLog table)
- *Acceptance criteria:* A simulated verification failure (corrupted copy) results in the local file being **retained**, not deleted, and logged as `FAILED`; a successful case logs `SUCCESS` with duration and method.
- *Definition of Done:* This is the single most safety-critical test in the project — integration test must explicitly cover the "verification fails → local file survives" path, not just the happy path.

**M6.6 — Failure recovery (NAS disconnects mid-sync)**
- *Objective:* Pause (not abort) on connection loss, preserve already-copied files, "NAS connection lost / Synchronization paused" message, Resume/Retry/Cancel.
- *Files:* `src/main/nas/NASService.ts` (extend), `src/renderer/dialogs/NasFailureDialog.tsx`
- *Dependencies:* M6.5
- *Acceptance criteria:* Simulated mid-batch disconnect leaves already-copied files intact and uncopied files untouched; Resume continues from the correct point.
- *Definition of Done:* Integration test simulating disconnect at a specific point in a multi-file batch.

---

### Milestone 7 — Web Lookup

**M7.1 — Managed Series CRUD**
- *Objective:* Add/remove/rename series, enable/disable lookup (FR-300).
- *Files:* `src/main/lookup/LookupService.ts`, `src/renderer/pages/LookupPage.tsx` (series management section)
- *Dependencies:* M1.4
- *Acceptance criteria:* CRUD operations persist correctly and reject duplicate `normalizedName` entries.
- *Definition of Done:* Unit + RTL tests.

**M7.2 — Local progress determination (decision #3)**
- *Objective:* Scan local library, determine highest season present, then highest episode within that season (per decision #3, not simply the globally-highest episode).
- *Files:* `src/main/lookup/LocalProgressScanner.ts`
- *Dependencies:* M2.1 (uses Parser output on library folder names)
- *Acceptance criteria:* Given a fixture library with S01–S03 folders, correctly identifies S03 as current and its highest episode within S03 specifically — not, e.g., a higher episode number that might exist under an older season.
- *Definition of Done:* Unit test explicitly covering a case where an earlier season has a higher episode *number* than the latest season, to prove the season-first logic (decision #3) is correctly implemented and not accidentally reverted to a naive "max episode overall."

**M7.3 — URL generation + name normalization**
- *Objective:* `LookupProvider` interface, name normalization rules (remove parentheses/punctuation/duplicate spaces/4-digit years), URL construction restricted to current season only (decision #3).
- *Files:* `src/main/lookup/providers/ILookupProvider.ts`, `src/main/lookup/UrlBuilder.ts`
- *Dependencies:* M7.2
- *Acceptance criteria:* Matches both SRS §16.3 examples (`Dexter (2021)` → `Dexter`; `Law & Order: SVU` → `Law Order SVU`) exactly.
- *Definition of Done:* Unit tests for both documented examples plus 3 additional normalization edge cases.

**M7.4 — RLSBBProvider: search + HTML parsing**
- *Objective:* Implement `search()`/`parseResults()`/`findLatestEpisode()` using `axios` + `cheerio` against saved fixture HTML (not live scraping in tests, per §8).
- *Files:* `src/main/lookup/providers/RLSBBProvider.ts`, `tests/fixtures/rlsbb-sample.html`
- *Dependencies:* M7.3
- *Acceptance criteria:* Correctly extracts Season/Episode/Title/Release Date/URL from fixture HTML; correctly filters out non-TV categories (FR-303).
- *Definition of Done:* Unit tests against at least 2 fixture HTML variations (with and without new episodes present).

**M7.5 — Lookup execution + progress + results UI**
- *Objective:* `Check for New Episodes` button, progress dialog, results table with status badges/highlighting (SRS §16.8), per-row "Open Search."
- *Files:* `src/main/ipc/lookupHandlers.ts`, `src/renderer/pages/LookupPage.tsx` (results section)
- *Dependencies:* M7.4
- *Acceptance criteria:* One failing series lookup (simulated network error) doesn't stop remaining series (§16.5); results persist to `LookupHistory` and restore correctly on next app launch.
- *Definition of Done:* E2E test covering the persistence-across-restart requirement explicitly (SRS Acceptance Criteria: "Cached lookup restored").

---

### Milestone 8 — Settings, Logs, Packaging

**M8.1 — Full Settings page**
- *Objective:* All sections from SRS §19 (General, Folder Configuration, MKVToolNix, NAS, Web Lookup, Subtitle Preferences, Advanced).
- *Files:* `src/renderer/pages/SettingsPage.tsx` + subsections
- *Dependencies:* M1.5, all prior milestones' settings keys
- *Acceptance criteria:* Every setting referenced anywhere in the SRS is editable here; changes persist and take effect without requiring an app restart where feasible.
- *Definition of Done:* RTL test per settings section; manual verification checklist against the full SRS §19 list.

**M8.2 — Export/Import settings, reset cache/settings**
- *Objective:* Advanced section actions.
- *Files:* `src/main/settings/SettingsService.ts` (extend)
- *Dependencies:* M8.1
- *Acceptance criteria:* Exported JSON re-imports to an identical state; reset actions correctly scope to cache-only vs. full settings.
- *Definition of Done:* Integration test for export→reset→import round trip.

**M8.3 — Logs tab**
- *Objective:* Search/filter/copy/export/clear over the `Logs` table.
- *Files:* `src/renderer/pages/LogsPage.tsx`, `src/main/ipc/logsHandlers.ts`
- *Dependencies:* M1.6
- *Acceptance criteria:* Filter by level/source/date range works correctly against a seeded fixture log set.
- *Definition of Done:* RTL test covering each filter dimension.

**M8.4 — Packaging: installer + portable build**
- *Objective:* `electron-builder` configuration producing a signed-or-unsigned (TBD) NSIS installer and a portable `.exe`.
- *Files:* `electron-builder.yml`, CI/build scripts
- *Dependencies:* all prior milestones (this is effectively a release-candidate build)
- *Acceptance criteria:* Both artifacts install/run correctly on a clean Windows VM; app data lands in the expected `userData` location.
- *Definition of Done:* Manual install test on a clean machine/VM, documented in the README.

---

### Milestone 9 — Hardening

**M9.1 — 20,000-file performance benchmark**
- *Objective:* Generate a synthetic large library/incoming fixture; measure startup, refresh, and cache-hit timings against SRS §23 targets.
- *Files:* `tests/performance/largeLibraryBenchmark.ts`
- *Dependencies:* all functional milestones
- *Acceptance criteria:* All four SRS §23 timing targets met; if not, this task's output is a profiling report identifying the specific bottleneck for follow-up work (not a silent pass/fail).
- *Definition of Done:* Benchmark script committed and runnable on demand; results documented.

**M9.2 — Security review pass**
- *Objective:* Verify every item in §6 of this document against the actual implementation (safeStorage usage, redaction, `execFile` array-args-only, CSP, contextIsolation, path traversal guards).
- *Files:* n/a (audit task; findings become follow-up bug/task entries in `bugs.md`)
- *Dependencies:* all functional milestones
- *Acceptance criteria:* Every §6 bullet has a corresponding passing test or documented manual verification.
- *Definition of Done:* Checklist-style report added to `bugs.md`/`decisions.md` noting pass/fail per item, with follow-up tasks filed for any gaps.

**M9.3 — Coverage push to 80%+**
- *Objective:* Identify and fill coverage gaps, prioritizing Parser/Processing Engine/NAS verification logic per §8.
- *Files:* varies
- *Dependencies:* all prior milestones
- *Acceptance criteria:* Overall coverage ≥ 80%; the three correctness-critical modules specifically at a higher bar (recommend 90%+ for those three).
- *Definition of Done:* CI coverage report meets the stated thresholds.

---

## Summary

This architecture directly incorporates all five decisions from `decisions.md` (filename-based converted matching, verify-before-delete, current-season-only lookup scoped to the highest local season, the narrowed `SxxEyy` filename convention, and this document's own role as the durable design record). It also surfaces one schema gap found during this pass — the missing `SyncLog` table required to satisfy SRS §17.11 — and resolves it as part of the Milestone 1 schema work rather than leaving it for later discovery.

No implementation has been started. Waiting for your approval before beginning Milestone 1.
