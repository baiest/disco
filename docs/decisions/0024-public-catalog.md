# 0024. Public catalog

## Context

Customers asked the same questions again and again. Phase 2 puts a catalog a customer can open from a
link, with no account, and a way to ask about a record. The database was owner only: every table
answers only to its owner.

## Decision

- What a customer sees: the list (a picture, title, artist; a search box) and one page per record (all
  photos and videos, title, artist, notes). Available records are shown, and sold ones marked "Vendido".
  Drafts, unavailable records and deleted records are never shown.
- The price is hidden by default. Each record has a switch, "Mostrar el precio al público", which the
  owner turns on on purpose; it needs a price to be turned on. The database applies it, not the screen.
- Contact is a WhatsApp button with a ready message ("Hola, ¿sigue disponible «La Voz»?"), shown only
  for available records and only when the shop's number is set in `NEXT_PUBLIC_WHATSAPP_NUMBER`.
- A visitor gets no access to the tables. Three functions run with the owner's rights (`public_records`,
  `public_record`, `public_record_media`) and return only public columns; no owner, no internal dates,
  no Facebook state. A fourth, `is_public_media_path`, lets a storage policy ask "does this file belong
  to a visible record?" because a policy runs with the visitor's rights.
- The storage bucket stays private. A visitor may read only the files of visible records, and the server
  hands out signed links of one hour for them.
- Public pages use a Supabase client with no cookies and no session, so they never depend on who looks.
- The public search copies the admin search (accents, any word order, typos in long words) instead of
  sharing it, to leave the admin function and its tests alone. If one changes, the other must follow.

## Consequences

- The site address now opens the catalog; the owner reaches his screens through `/login` or `/admin`.
- Public pages are rendered on each request. A cache could be added if traffic grows.
- Link previews on social networks show no picture, because the picture links expire.
- The free Vercel plan is for non commercial use as far as we know; a public catalog for a business
  needs that settled first (see 0012).
