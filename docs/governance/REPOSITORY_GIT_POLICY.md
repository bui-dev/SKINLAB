# Repository, Branch, and Release Policy

## Target repository

`/Users/admin/Documents/Docker/SKINLAB` becomes the single fresh Git repository and pnpm workspace root during Engineering Foundation.

```text
SKINLAB/
├── admin-skinlab/       # Next.js application
├── api-skinlab/         # NestJS application
├── packages/            # shared contracts/config/test support
├── docker/              # compose, deployment, backup/restore automation
└── docs/                # specs, ADRs, plans, reviews, runbooks, governance
```

The root `pnpm-workspace.yaml` includes:

```yaml
packages:
  - admin-skinlab
  - api-skinlab
  - packages/*
```

## Fresh-history migration

1. Confirm the current `admin-skinlab` working tree has no uncommitted work.
2. Record the old remote URL and current commit for recoverability.
3. Remove only `admin-skinlab/.git`; retain all application files.
4. Create a root `.gitignore` before the first root commit.
5. Initialize Git at `SKINLAB/` and verify no nested repositories remain.
6. Run frontend checks before and after workspace conversion.
7. Create a new remote for the monorepo; do not overwrite or force-push the old frontend remote.

The old repository history is not imported into active monorepo history.

## Branch model

```text
feature/* or fix/*
        ↓ PR
       dev
        ↓ promotion PR
       stg
        ↓ approved promotion PR
      main
```

### `dev`

- Integration branch.
- Feature/fix branches originate from and return to `dev`.
- Required CI runs before merge.
- Direct pushes are prohibited.

### `stg`

- Release-candidate branch.
- Receives changes only from `dev` through promotion PRs.
- Successful changes deploy to the Ubuntu VM staging environment.
- Staging uses fake data until external gates close.
- Direct fixes are prohibited.

### `main`

- Production-approved history.
- Receives changes only from `stg` through an approved promotion.
- Protection and mandatory checks apply.
- A merge into `main` does not by itself authorize real data or production deployment.

## Hotfix rule

After production exists, an emergency hotfix starts from `main`, is reviewed and released under the incident runbook, and is then merged forward/back into `stg` and `dev` so no fix exists on only one long-lived branch.

## Environment configuration

- No environment-specific code branches.
- Secrets and environment values are injected at runtime.
- Real `.env` files are ignored and never committed.
- Each application may provide only redacted `.env.example` files.
- Environment changes require review even when application code does not change.

## Artifact promotion

- Build a versioned immutable artifact for the staging candidate.
- Record source commit, dependency lockfile, build command, and image digest.
- Test that artifact on staging.
- Promote the same digest to production after approval; do not rebuild from mutable inputs.

## Documentation policy

- `docs/` is committed in the same repository as code.
- Architecture and governance decisions are linked from ADRs.
- Plans use repository-relative paths.
- Review records identify the exact commit or artifact reviewed.
- Superseded documents remain in history and are marked superseded rather than silently rewritten when auditability matters.
