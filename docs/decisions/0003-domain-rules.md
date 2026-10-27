# 0003: Record domain rules (Phase 1)

Status: accepted

## Context

The owner registers records from a phone with as little typing as possible.
Data is often incomplete, and the app must never invent a price.

## Decision

- Statuses: `draft`, `available`, `sold`, `unavailable`.
- A record can be published (`available`) with at least one photo. Title,
  artist, price and notes stay optional.
- A draft can only move to `available`. Published records move freely between
  `available`, `sold`, `unavailable` and back to `draft`.
- Every status change returns an undo payload that restores the previous status.
- Prices are whole Colombian pesos stored as an integer, at most 2,000,000,000.
  Input accepts `80000`, `80.000`, `$80.000` and `80 mil`. A missing price is
  shown as "price on request" by the UI, never as a number.
- Lists split into drafts and published records, newest update first, and leave
  out soft-deleted records.
- The rules live in `packages/domain` as pure functions with no framework
  imports. Failure reasons are codes; the UI turns them into Spanish text.

## Consequences

- Server actions and the UI share one source of truth for these rules.
- Changing the allowed transitions or the price format is a domain change with
  tests first.
