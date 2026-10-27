# 0007: One record per physical copy

Status: accepted

## Context

A store can hold several copies of the same album, in different condition and at
different prices. A sold copy can also come back, and the owner may want to reuse
its photos or take new ones.

## Decision

- Every physical copy is its own record, with its own price, status and photos.
  There is no quantity field.
- An "add another copy" action creates a new draft that copies title, artist,
  price and notes, and lets the owner choose between the same photos and new
  ones. Reused photos are copied by the server into the new record's storage
  folder, so the two records never share files.
- The same copy coming back is a status change from sold to available; its
  photos stay and can be replaced.
- Sales history is not stored in Phase 1.
- The public catalog (Phase 2) can group copies of one album by artist and
  title, or through an optional album key added later by a migration.

## Consequences

- The schema needs no change now; `duplicateRecord` in `packages/domain` and
  the buttons come with the create and list tickets (DISCO-5 and DISCO-6).
- Photos are stored once per copy, which costs a little storage in exchange for
  independent deletion.
