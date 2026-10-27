# 0005: Merge commits, no squash

Status: accepted (replaces the squash rule in 0002)

## Context

Branches are small and every commit is written to the format in AGENTS.md
section 8, with its own What and Why. The owner prefers to keep that history.

## Decision

- Pull requests are merged with a merge commit. Squash and rebase merges are
  not allowed.
- `main` does not require linear history.
- Every commit in a PR must pass `scripts/check_commit.sh`; CI already checks
  all of them.
- Merge commits themselves are skipped by the format check.

## Consequences

- `main` shows each branch's commits plus one merge commit per PR.
- The ruleset allows only the `merge` method.
