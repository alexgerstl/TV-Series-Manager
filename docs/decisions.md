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

