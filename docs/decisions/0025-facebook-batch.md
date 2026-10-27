# 0025. The Facebook batch: put a post together, review it, then publish

## Context

Publishing was a button on one record that made a post of that record alone. The owner posts several records
together, and wanted to see which ones he has in the post, and to take one out or fix one before publishing.

## Decision

- A record has a button "Agregar al lote de Facebook" (and "Quitar del lote de Facebook"). It replaces the
  single publish button: one record is just a batch of one.
- The batch is kept on the phone, in the browser, so it survives a reload and is shared by every admin screen.
  It is the same list the capture form already filled with the records saved in a session. Every part of the
  page learns of a change through one notice, because storage events do not fire in the tab that made them.
- While the batch has something in it, every admin screen shows a card with a miniature for each record (up to
  four, and "y N más"), how many records and how many photos and videos it holds out of the 30 a post takes, and
  "Revisar y publicar". The server looks up only the records that can still be posted (available, not deleted), so
  one that was sold or deleted since is dropped from the batch by itself.
- The review screen lists every record with its miniature, title and number of files, and each has Edit (opens
  the record; the batch stays) and Remove (takes it out of the post and of the batch). "Agregar más discos"
  opens the picker with the current ones already chosen. Over 30 files, or no files at all, publishing is blocked
  with a plain explanation until something changes.
- "Ya lo publiqué" marks all of them as posted and empties the batch, as before.

## Consequences

- The batch lives in one browser: another phone or a cleared browser starts with an empty batch.
- Removing a record from the batch does not touch the record.
- The text of a post starts empty for a batch and with the suggested text for a batch of one record.

## Update: search and see what is chosen

The "which discs" screen was a plain list of checkboxes: no search, no pictures and no way to see what was
already chosen. It now has a search box (same search as the admin, over available records), a miniature on
every row, and the chosen discs shown above the list with the batch card.

- The choice is the batch kept on the phone, not a form. A search is a normal page load, so the batch is what
  makes the ticks survive it. The `keep` parameter is gone; "Agregar más discos" opens the screen and the batch
  does the rest. "Preparar publicación (N)" opens the review with exactly the chosen discs.
- In the review, the whole card opens the record (no "Editar" button) and removing is a cross at the top right.
  The record page gets `from=publish&ids=...`, and its back arrow returns to that review. Only record ids are
  read from the address (`lib/back-target.ts`), never a path, so it cannot be used to send the owner elsewhere.
