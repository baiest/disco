# 0006: Database schema and security (Phase 1)

Status: accepted (the photos table became `record_media` in 0010)

## Context

Phase 1 only populates the database (see 0004). The owner is the single admin;
the data must stay valid even if application code has a bug.

## Decision

- Tables `records` and `record_photos`, a private `record-photos` bucket, and
  migrations in `supabase/migrations`.
- Record IDs default to a random UUID but the client may send its own, so a
  double tap is the same record.
- The key rules are enforced in the database as well as in `packages/domain`:
  price between 0 and 2,000,000,000, four statuses, no publishing without a
  photo, a draft can only become available, the owner never changes, text
  length limits.
- At most 8 photos per record, enforced with a position range of 0..7 and a
  deferrable unique constraint (so photos can swap places in one transaction).
- A photo's owner must equal its record's owner (composite foreign key) and its
  storage path must start with `{owner_id}/{record_id}/`.
- A published record keeps at least one photo; delete them only after moving
  the record back to draft.
- Row level security on both tables, scoped to the authenticated owner.
  Anonymous visitors have no grants. Records have no delete grant: deleting is
  setting `deleted_at`.
- Storage policies only allow access to the folder named after the user's ID.
  Files are limited to 5 MB and to JPEG and WebP.
- `packages/db` tests all of this on plain PostgreSQL with minimal stand-ins
  for `auth` and `storage`; CI runs them against a `postgres:16` service.

## Consequences

- Real Supabase Auth and Storage are not exercised by CI. They need a manual
  check on a real project before production use.
- The CI Postgres image is pinned by tag, not by digest; pin it when a digest
  can be fetched.
- Supabase local config (`supabase/config.toml`) was written without running
  the CLI and needs a first run on a machine with Docker.
