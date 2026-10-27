# 0022. Deleting a record, with confirmation and undo

## Context

The owner needs to get rid of records he added by mistake or no longer wants. AGENTS.md allows soft
delete only, with undo, and the database has no permission to erase a record through the API: deleting
is setting `deleted_at`. Separately, a search with no results only said "Ningún disco encontrado" in a
small grey line that was easy to miss.

## Decision

- The record detail has an "Eliminar disco" button. It opens a confirmation dialog whose focus starts on
  the safe choice ("No, conservarlo"); Escape or a tap outside cancel. The dialog says the record leaves
  his lists and can be undone right after; if it was posted on Facebook it also says that post stays
  there, because the app cannot take it down.
- Confirming sets `deleted_at` (nothing is erased, photos and videos stay) and goes back to the list with
  a notice, "Disco eliminado. Deshacer". Undo sets `deleted_at` back to null. The notice is driven by
  `?undo=<id>` in the address and shows only if that record is actually deleted, so reloading after an
  undo does not show it again.
- Deleted records still never appear in the search, the counts or the publish lists (they already did not).
- A search or a filter with no results shows its own card: what was searched, a hint, and a link to see
  everything when a filter is hiding the result.

## Consequences

- There is no screen to see or restore deleted records later; only the notice right after deleting. A
  "trash" view is not built.
- Storage keeps the files of deleted records.
