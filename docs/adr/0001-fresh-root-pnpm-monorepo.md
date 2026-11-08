# ADR-0001: Fresh root pnpm monorepo

**Status:** Accepted  
**Approval scope:** Ratified for repository structure  
**Date:** 2026-11-08  
**Decision owner:** Project Sponsor / Product Owner

## Context

The `SKINLAB/` directory currently contains:

- `admin-skinlab/`, an independent frontend Git repository;
- `api-skinlab/`, a non-repository backend directory;
- `docker/`, a non-repository infrastructure directory; and
- `docs/`, the official project documentation directory.

The approved implementation direction is a pnpm monorepo. A parent Git repository containing an unmanaged nested Git repository would make atomic frontend/backend/documentation changes and release traceability confusing.

The owner does not require the old frontend Git history in the new active repository and does not want to overwrite the old frontend remote.

## Options considered

1. Import the complete frontend history into a new root monorepo. Preserves history but adds migration complexity that provides little current value.
2. Create a root repository using frontend/backend Git submodules. Preserves independent repositories but increases coordination, CI, and promotion complexity for a one-person team.
3. Create a fresh root monorepo and retain only the current frontend files. Simplest operating model; old history remains recoverable from the old remote if retained.

## Decision

Use option 3.

`/Users/admin/Documents/Docker/SKINLAB` becomes the single Git repository and pnpm workspace root. The nested `admin-skinlab/.git` metadata is removed during Engineering Foundation after verifying a clean working state and recording the old remote/commit. Application files remain.

The workspace keeps these top-level paths:

- `admin-skinlab/`
- `api-skinlab/`
- `packages/`
- `docker/`
- `docs/`

A new remote repository is created for the monorepo. The old frontend remote is not force-pushed or reused as the monorepo remote.

## Consequences

### Positive

- One commit/PR can change frontend, backend, infrastructure, contracts, and documentation atomically.
- `docs/` remains the official project documentation location.
- pnpm workspace dependencies and CI are managed once at the root.
- The repository model is simpler for the solo developer.

### Negative / risks

- Active monorepo history starts fresh and does not include prior frontend commits.
- Implementation plans that previously used `apps/admin-web`, `apps/api`, and `infra/` were updated during the governance pass.
- Removing nested Git metadata is destructive locally; the clean-state and old-remote checks are mandatory.

## Verification

- `git rev-parse --show-toplevel` from every top-level project directory resolves to `SKINLAB/`.
- No nested `.git` directory remains.
- `pnpm -r lint`, `pnpm -r typecheck`, `pnpm -r test`, and `pnpm -r build` pass.
- The new remote contains the root tree and the old frontend remote remains unchanged.
- All implementation-plan paths use the accepted root layout.
