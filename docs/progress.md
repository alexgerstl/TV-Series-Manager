# TV Series Manager — Progress Tracker

This file tracks implementation status against the roadmap in `architecture.md` §9. Update it at the end of every approved task.

Status values: `Not Started` · `In Progress` · `Blocked` · `Done`

---

## Status Summary

| Milestone | Status | Tasks Done |
|---|---|---|
| M1 — Foundation | In Progress | 1 / 8 |
| M2 — Parser + File Monitor | Not Started | 0 / 4 |
| M3 — MKVToolNix Integration | Not Started | 0 / 7 |
| M4 — Processing Engine | Not Started | 0 / 6 |
| M5 — Tools Page | Not Started | 0 / 3 |
| M6 — NAS Sync | Not Started | 0 / 6 |
| M7 — Web Lookup | Not Started | 0 / 5 |
| M8 — Settings, Logs, Packaging | Not Started | 0 / 4 |
| M9 — Hardening | Not Started | 0 / 3 |

**Overall: 1 / 46 tasks complete.**

---

## Milestone 1 — Foundation

| Task | Status | Date | Notes |
|---|---|---|---|
| M1.1 — Project scaffold | **Done** | 2026-07-10 | Electron+React+TS scaffold, ESLint/Prettier/Vitest/electron-builder wired. `typecheck`/`lint`/`test`/`build` all verified clean. Live `npm run dev` window launch still needs manual verification on Windows (no display in dev sandbox). |
| M1.2 — Database connection + migration runner | Not Started | | |
| M1.3 — Core schema migration | Not Started | | |
| M1.4 — Repository layer skeleton | Not Started | | |
| M1.5 — Settings Service + safeStorage integration | Not Started | | |
| M1.6 — Logging Service | Not Started | | |
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
- **From M1.1:** Live `npm run dev` Electron window launch has not been manually verified (no GUI in the dev sandbox) — needs a manual check on the target Windows machine before M1 is considered fully closed out.

---

## Change Log

| Date | Change |
|---|---|
| 2026-07-10 | File created. M1.1 marked Done. |
