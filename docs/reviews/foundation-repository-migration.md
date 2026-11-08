# Foundation Repository Migration Evidence

**Status:** Local bootstrap committed and verified; remote and branch-protection gate pending  
**Started:** 2026-11-09  
**Scope:** Foundation Task 1 — fresh root pnpm monorepo

## Product Owner authorization

On 2026-11-09, the Product Owner explicitly lifted the execution hold and authorized Foundation Task 1 to begin. Authorization remains limited to fake-data local/staging work. It does not authorize real patient data, production deployment, or replacement of paper clinical records.

## Source repository precondition

| Evidence         | Observed value                                 |
| ---------------- | ---------------------------------------------- |
| Source path      | `admin-skinlab/`                               |
| Source branch    | `dev` tracking `origin/dev`                    |
| Source commit    | `090b899 Init project`                         |
| Source remote    | `https://github.com/bui-dev/admin-skinlab.git` |
| Working tree     | Clean before migration                         |
| Required runtime | Node.js `22.23.3`, pnpm `12.18.0`              |

The original frontend remote is recorded for provenance only and must not be reused as the monorepo remote.

## Baseline verification before nested Git removal

Executed with Node.js `22.23.3` on 2026-11-09:

- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: passed — 4 files, 6 tests.
- `pnpm format:check`: passed.
- `pnpm exec next build --webpack`: passed.

An initial test attempt under Node.js `20.19.4` could not start Vitest workers because `undici@8.12.4` requires the Node 22 Zstandard API. No source or dependency change was made; rerunning with the plan-pinned Node.js version passed.

## Root migration evidence

- Nested `admin-skinlab/.git` was removed from the monorepo path only after the clean-state check. A recoverable local copy is retained at `/tmp/skinlab-admin-git-backup-20261109/admin-skinlab.git` for this migration session.
- Fresh root Git was initialized on `main`.
- Root `pnpm-lock.yaml` contains the `admin-skinlab`, contracts, and test-support importers and retains `@parcel/watcher`, `@swc/core`, and `esbuild` dependencies under the approved build policy.
- Frozen install succeeded and the migrated frontend passed 6 tests.
- Workspace verifier passed; the shared contract smoke test passed with `ContractVersion = 1`.
- Gitleaks `v8.30.1` is pinned and its official archive is SHA-256 verified before first use.
- Secret-scan test proved that a temporary synthetic private-key fixture is rejected, that the same directory passes after fixture removal, and that the repository worktree is clean. The synthetic credential was never staged or committed.
- Full local gate passed under Node.js `22.23.3`: install, secret scan, lint, typecheck, tests, and builds.
- Frontend tests: 4 files / 6 tests passed. Shared contracts: 1 file / 1 test passed. Other shared package checks completed with zero failures.
- Root CI defines stable `quality` and `secret-scan` jobs and contains no deployment credentials or deployment job.
- Fresh root commit: `e3a1de1 build: establish skinlab pnpm monorepo`.
- Post-commit Gitleaks scan covered the worktree and the first Git commit; both scans reported no leaks.
- Pre-existing local-only paths `.agents/`, `.antigravity`, `AGENTS.md`, and `frontend-junior-interview-roadmap-7-days.md` were deliberately not included because they are outside the approved Task 1 add scope.

## Known tooling warnings

`pnpm peers check` reports existing ecosystem peer-range gaps: ESLint plugins currently declare support through ESLint 9 while the approved frontend pins ESLint 10.14.0, and `tsconfck` declares TypeScript 5 while the compatibility alias is TypeScript 6.0.2. The executable lint, typecheck, test, and build gates pass. These warnings are recorded for later dependency maintenance rather than resolved by changing approved versions during repository migration.

## Pending remote gate

- Selected remote: `git@github.com:bui-dev/SKINLAB.git`. The active SSH identity authenticates as `manhtruongbui63` and does not have repository access, while the existing HTTPS credential passed read and write dry-run checks. Therefore local `origin` uses `https://github.com/bui-dev/SKINLAB.git` for the same repository. The old frontend remote is not reused.
- Remote CI evidence for `quality` and `secret-scan`.
- Protected `main`, `dev`, and `stg` rules and final checkout on `dev`.
