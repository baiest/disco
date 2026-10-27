# 0002: Monorepo layout and strict pipeline

Status: accepted

## Context

The project needs a strict, automated gate from the first commit, and the
repository is public.

## Decision

- pnpm workspaces: `apps/web` (Next.js), `packages/domain` (pure logic),
  `packages/config` (shared TypeScript and Vitest configuration).
- One ESLint flat config at the root: typescript-eslint strict type-checked
  rules, Next.js rules, `--max-warnings=0`.
- TypeScript strict, plus `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`. TypeScript is pinned to 6.0.x because
  typescript-eslint does not support 7.x yet.
- Vitest with 80% thresholds on lines, functions, branches and statements.
- GitHub Actions `CI` with four jobs: Repo checks (LF, commit format), Secret
  scan (gitleaks), Lint/types/tests/build, Dependency audit. Actions are pinned
  by commit SHA, with read-only token permissions and a frozen lockfile.
- Local hooks in `.githooks` run the same gates before push and reject
  attribution trailers at commit time.
- `main` protection is stored as `.github/rulesets/main.json` and imported by
  the owner, because it cannot be applied from the repository itself.

## Consequences

- Every change needs a green PR; direct pushes to `main` stop once the ruleset
  is active.
- Bumping TypeScript to 7 waits for typescript-eslint support.
- The ticket prefix in commits is `DISCO-<n>`.
