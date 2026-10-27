# 0014. Inventory list and search

## Context

The owner needs to answer "do I have it? did I already sell it?" quickly, with typos
and without technical knowledge. The database already has `search_records`
(accent and typo tolerant, with filters).

## Decision

- `/admin` is the inventory: a search box, five filters (all, available, sold, no
  price, not on Facebook) and one card per album.
- The search runs in the database through `search_records`; the web app only validates
  the address parameters (filter whitelist, text capped at 100 characters) and checks the
  shape of each row it gets back.
- Copies of the same album are grouped with `summarizeCopies`; the card shows plain
  chips: "Lo tienes: N disponibles", "No lo tienes ahora: N vendidos el 12 oct".
- A card is marked "Parecido a lo que escribiste" only when every copy matched loosely.
- A failed search shows an error, never an empty list that looks like "you do not have it".

## Consequences

- Cards have no photo yet (no signed thumbnail URLs) and copies are not tappable; both
  come with the detail screen in the next ticket.
- Results are limited to 100 copies; there is no paging yet.
