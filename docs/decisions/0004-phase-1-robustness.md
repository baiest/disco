# 0004: Phase 1 robustness

Status: accepted

## Context

Phase 1 only populates the database. The owner will register hundreds of
records from a phone, often with a weak signal, and is not technical. Losing a
record or creating duplicates would destroy trust in the tool.

## Decision

- Create the record as a draft first; upload photos separately with automatic
  retries and visible progress ("2 of 3").
- Keep unsent input in the browser until the server confirms it, so an expired
  session or a lost connection does not lose work. This is a safety net, not a
  full offline mode.
- Generate record IDs on the client so a double tap is the same operation.
- Duplicate the key rules in the database (price >= 0, four statuses, a record
  cannot be `available` without a photo) on top of `packages/domain`.
- Re-validate everything on the server with the domain functions.
- Soft delete with undo; no hard delete from the UI.
- Photos are resized and orientation-corrected on the phone, EXIF data (GPS) is
  removed, only JPEG and WebP are accepted, at most 8 per record.
- Test RLS with two real users and test failure paths: failed upload, double
  submit, expired session mid-form.
- Backups: the free Supabase plan has no point-in-time restore, so a
  documented `pg_dump` routine lives in the repo and the owner runs or
  schedules it.
- After saving, offer a large "add another" action to speed up bulk entry.
- All Supabase access goes through one server module in `apps/web`.

## Consequences

- DISCO-3 (schema and RLS) and DISCO-5 (create flow and photo upload) carry
  most of this work.
- Out of scope on purpose: duplicate detection (a store can hold several copies
  of one record), an error-tracking service and full offline sync.
