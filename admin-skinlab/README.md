# admin-skinlab

Production-ready frontend foundation for the SkinLab administration application. The repository contains infrastructure and isolated examples only—no business pages, mock data, or real authentication.

## Requirements

- Node.js 22.12.0 or newer (Node 22.23.3 is used in CI)
- pnpm 12.18.0

TypeScript 7 is the project compiler. The TypeScript 6 compatibility API is installed under the `typescript` alias because the current `typescript-eslint` toolchain requires the legacy compiler API; `@typescript/native` provides the TypeScript 7 `tsc` binary.

## Setup

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

The API variables in `.env.example` are non-secret local examples. Replace them in `.env.local` for your environment and never put credentials in a `NEXT_PUBLIC_` variable.

## Scripts

| Command                | Purpose                              |
| ---------------------- | ------------------------------------ |
| `pnpm dev`             | Start the Next.js development server |
| `pnpm build`           | Create a production build            |
| `pnpm start`           | Serve the production build           |
| `pnpm lint`            | Run ESLint                           |
| `pnpm lint:fix`        | Run ESLint with safe fixes           |
| `pnpm typecheck`       | Run TypeScript with `tsc --noEmit`   |
| `pnpm format`          | Format supported files with Prettier |
| `pnpm format:check`    | Verify formatting without changes    |
| `pnpm test`            | Run Vitest once                      |
| `pnpm storybook`       | Start Storybook on port 6006         |
| `pnpm build-storybook` | Build the static Storybook           |

## Folder structure

```text
src/
├── app/                 # App Router routes and route-level boundaries only
├── components/
│   ├── shared/          # Reusable, feature-agnostic composed components
│   └── ui/              # shadcn/ui primitives
├── config/              # Validated environment configuration
├── features/            # Removable feature modules
│   ├── auth/            # Vendor-neutral session foundation
│   └── example/         # Isolated query and form examples
├── hooks/               # Feature-agnostic React hooks
├── i18n/                # Locale configuration and request resolution
├── lib/                 # API client, errors, and small utilities
├── messages/            # en/vi translation messages
├── providers/           # Application provider composition
├── stores/              # Zustand stores
├── styles/              # Global CSS and design tokens
├── test/                # Shared test setup
└── types/               # Cross-feature TypeScript types
```

## Conventions

### Imports

- Use the `@/*` alias for source imports.
- Do not use relative imports that climb more than one level.
- Vitest and Storybook both resolve the same alias.

### Components

- Put shadcn primitives in `src/components/ui`.
- Put reusable, domain-neutral compositions in `src/components/shared`.
- Put domain or workflow-specific components under their owning feature.
- Components are Server Components by default. Add `"use client"` only when state, effects, context, event handlers, or browser APIs require a client boundary.

### Data fetching

- Server Components and route handlers call `apiFetch` directly and retain Next.js server fetch semantics.
- Client Components use feature-owned TanStack Query hooks.
- Do not force server-side requests through TanStack Query or a client provider.
- HTTP uses native `fetch`; `src/lib/api` supplies base URL selection, JSON handling, query serialization, timeout, and typed errors.

### Environment variables

- `src/config/env.ts` has separate Zod schemas for server and client variables.
- `API_BASE_URL` is server-only.
- `NEXT_PUBLIC_API_BASE_URL` is visible in the browser and must never contain a secret.
- Environment parsing is lazy so tooling and a clean production build do not require unused API configuration.
- Commit `.env.example`; keep `.env.local` untracked.

### Internationalization

The app uses `next-intl` with `en` and `vi` messages. Routing intentionally has no locale segment. The request configuration selects Vietnamese when `Accept-Language` includes `vi` and otherwise uses English. No locale switcher is included in this foundation.

### Authentication

`src/features/auth` contains types plus server/client stubs only. It does not store tokens or credentials. Next.js 16 renamed the executable root convention from `middleware.ts` to `proxy.ts`; add `src/proxy.ts` only after an auth vendor and route policy are selected. Authorization must still be enforced in server actions and route handlers.

### Isolated examples

The `example` feature demonstrates a TanStack Query hook and a React Hook Form/Zod component without mounting either on a route. `src/stores/example-store.ts` demonstrates a typed Zustand selector. These examples contain no mock data and can be removed independently.

## Git hooks

- Pre-commit runs ESLint fixes and Prettier against staged files through lint-staged.
- Pre-push runs the full TypeScript check.

## Pre-merge quality gate

Run all commands before merging:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm format:check
pnpm test
pnpm build
pnpm build-storybook
```

GitHub Actions runs the install, lint, typecheck, formatting, test, and production build checks with dependency caching.

# admin-skinlab

# admin-skinlab
