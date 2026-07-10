# TV Series Manager — Decisions Log

This file tracks decisions made along the way, as questions come up during design and development that aren't (or aren't clearly) resolved in the SRS.

Related documents (to be added later):
- `architecture.md`
- `database.md`
- `api.md`
- `bugs.md`

---

## 2026-07-10 — Initial decisions (resolving SRS analysis open questions)

### 1. "Converted version exists" matching (Processing Engine, SRS §13 Step 2)

**Decision:** Match by **filename**, not by parsed Series/Season/Episode identity.

- The Processing Engine looks for a file in the Converted folder with the same filename (or same base filename) as the Incoming file.
- Implication: the Converter is expected to preserve the original filename (minus/plus container extension). If the converter changes the filename, matching will fail and the incoming version will be used instead — acceptable per current understanding, but flag if this becomes an issue in practice.

### 2. Local file deletion safeguard (NAS Move, SRS §17.7 / FR-402)

**Decision:** A local file shall only be deleted **after verification that it was successfully moved (copied) to the NAS**.

- This confirms and tightens FR-402: verification must complete successfully before any local delete occurs.
- Verification method (checksum vs. size/mtime) is still open — to be specified in `architecture.md` when the NAS Service is designed.

### 3. Web Lookup season scope (SRS §16.3)

**Decision:**
- Lookups are only ever performed for the **current season**.
- "Current season" = the **highest season number present in the local data directory**.
- Within that season, the **highest episode number** of that highest season is used as the local baseline for the lookup (i.e., lookup starts from `highestSeason`, `highestEpisode + 1`).
- This resolves the season-rollover ambiguity: the app does not guess a "next season" — it only searches for more episodes of whatever season is currently the latest one locally present. Moving to a new season effectively happens naturally once at least one episode of that new season exists locally (e.g., downloaded manually or found by other means), at which point it becomes the new "highest season" and lookups shift to it.

### 4. Filename convention (Parser, SRS §11)

**Decision:** For now, the application will work with filenames following the pattern:

```
<seriesname>.SxxEyy.<release>.mkv
```

Example:

```
House.of.the.Dragon.S03E03.720p.HMAX.WEB-DL.DDP5.1.H.264-NTb.mkv
```

- This narrows initial Parser scope to the standard dotted `SxxEyy` pattern only.
- Other patterns listed in the SRS as "supported" (`Series Name S01E02`, `Series_Name_1x02`, `Series.Name.102`) are **deferred** — not required for v1 parsing logic unless/until explicitly requested.
- Multi-episode filenames (`S01E01E02`, etc.) remain out of scope, consistent with this narrower convention.

### 5. Purpose of this file

**Decision:** `decisions.md` is designed to track decisions made along the way during design and development — a running decisions log / lightweight ADR, not formal requirements documentation (that stays in the SRS).

- Future companion docs planned: `architecture.md` (system/module design), `database.md` (schema details/ERD), `api.md` (internal service interfaces / IPC contracts), `bugs.md` (known issues/tracked bugs).
- Convention going forward: new decisions get appended under a dated heading, in the same format as above (short decision statement + rationale/implications).

---

## 2026-07-10 — Project Information

### Repository & Branching

**Decision:**

- Repository: `https://github.com/alexgerstl/TV-Series-Manager.git`
- Default branch: `main`
- Branch strategy:
  - `main` — always releasable; production-ready state only.
  - `develop` — integration branch; milestone/task work merges here first.
  - `feature/*` — one branch per task or small group of related tasks (e.g., `feature/m1.2-database-migrations`), branched from `develop`, merged back via PR.

---

## 2026-07-10 — Node.js runtime version (supersedes architecture.md §2)

**Decision:** Target Node.js **22 LTS or newer** (`"engines": { "node": ">=22.0.0" }`), not Node 20 LTS as originally stated in `architecture.md` §2.

**Rationale:** Node 20 LTS reached end-of-life in April 2026. The development machine already runs Node 24.16.0 (current Active LTS at time of writing), and `better-sqlite3` only ships prebuilt binaries for Node 24 starting at v12.0.0. Pinning to the now-EOL Node 20 would force local source compilation (`node-gyp`, requiring Python + a C++ toolchain) for no benefit.

**Implications:**
- `better-sqlite3` bumped from `^11.3.0` to `^12.11.1` (Node 24 prebuild support). No API changes affected our M1.2 code.
- `architecture.md` §2 technology stack table should be updated to read "Node.js 22 LTS (or newer)" instead of "Node.js 20 LTS" — noting here as the authoritative record; architecture.md to be amended alongside this entry.

## 2026-07-10 — Native module rebuild strategy (better-sqlite3 in Electron)

**Decision:** `better-sqlite3`'s native binary must be rebuilt against a *different* ABI depending on which runtime is loading it — Electron's embedded Node/V8 (when running the actual app) vs. the system Node.js (when running Vitest). Both target the same physical `node_modules/better-sqlite3/build/Release/better_sqlite3.node` file, so only one ABI can be "active" at a time.

Rather than requiring a manual rebuild step, this is automated via npm's `pre<script>` lifecycle hooks:
- `predev` / `prebuild` → `electron-rebuild -f -w better-sqlite3` (targets Electron's ABI, runs automatically before `npm run dev` / `npm run build`)
- `pretest` → `npm rebuild better-sqlite3` (targets the system Node ABI, runs automatically before `npm run test`)

**Rationale:** An earlier attempt wired `electron-rebuild` into `postinstall`, which left the binary permanently Electron-ABI'd after every `npm install` and broke `npm run test` (which runs under plain Node) immediately afterward. Scoping the rebuild to `pre<script>` hooks on the specific commands that need each ABI keeps both `npm run dev`/`build` and `npm run test` working with zero manual intervention, at the cost of a few seconds' rebuild time when switching between them — an acceptable tradeoff for a single-developer desktop app.

**Implication for future tasks:** any new native dependency added to this project (main-process-only) will need the same `-w <package-name>` treatment added to the `predev`/`prebuild`/`pretest` scripts.

