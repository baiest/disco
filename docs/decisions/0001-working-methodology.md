# 0001: Working methodology

Status: accepted

## Context

Disco is built for a small record store whose owner is not technical. The
project is developed together with a coding assistant, in small phases, and the
repository is public.

## Decision

- Adopt the working rules in `AGENTS.md`, adapted from the Loyall project:
  English only, TDD, strict quality gates, a fixed commit format, and
  PR-only changes to `main`.
- Use the ticket prefix `DISCO-<n>`.
- Forbid attribution trailers of any kind in commits, PRs, code and docs.
- Keep the repository public with no LICENSE file (all rights reserved).
- Use a pnpm monorepo: `apps/web`, `packages/domain`, `packages/config`.
- Build by phases; implement only the current phase.
- Keep a decision log as Google Doc and mirror each decision here as an ADR.

## Consequences

- Every change goes through a PR with green checks.
- Public visibility means secrets must never be committed; secret scanning and
  push protection are required.
- Without a license, others may read the code but may not reuse it.
- Dropped from Loyall: Go tooling, Docker-based local CI, Terraform and the
  `LOY-` ticket prefix. A local CI pipeline can be added later if GitHub
  Actions minutes become a constraint.
