# 0011: Search, copies summary and Facebook text

Status: accepted

## Context

The owner has hundreds of records and needs to answer "do I have it, did I
already sell it" fast, even when he writes a name without accents or with a
typo. Each copy is its own record (0007), so the answer has to combine copies.

## Decision

- Search lives in PostgreSQL as `search_records(query, filter, limit)`, with the
  `unaccent` and `pg_trgm` extensions. No external search service.
- It ignores case and accents, matches partial words in any order, needs every
  word to match, and tolerates small typos on words of 4 or more letters
  (similarity of at least 0.4). Matches reached only through a typo are flagged
  `is_close_match`. Title ranks above artist, and artist above notes.
- Only letters and digits reach the matching, so no symbol in the query can act as
  a wildcard. An empty or symbol-only query lists everything, newest first.
- Filters: `all`, `available`, `sold`, `no_price`, `not_on_facebook` (available and
  never posted). Deleted records never appear.
- The function runs with the caller's rights, so row level security still applies,
  and anonymous visitors cannot execute it. It returns status, sale date, Facebook
  state, number of media and the path of the first media.
- `packages/domain` turns the rows into an answer: `summarizeCopies` groups copies
  of the same album (same normalised title and artist; records without a title
  stand alone) and reports counts, the latest sale date and a stock state
  (`in_stock`, `sold_out`, `unavailable_only`, `draft_only`). The UI turns those
  codes into sentences such as "you have 1 available and sold 1 on 12 Oct".
- `buildFacebookPost` writes the post text in the owner's style (title in quotes and
  capitals, notes, availability). It leaves out price, artist and anything else, and
  the owner edits it before posting. Availability words are passed in, because they
  are text for his audience and belong in the messages files.
- `photoCount` became `mediaCount` and the `no_photo` reason became `no_media`,
  following the database.

## Consequences

- The search compares every row, which is fine for thousands of records. If it ever
  gets slow, add a normalised, indexed search column.
- The domain and the database both normalise text; their tests must keep agreeing.
- The extensions live in the `extensions` schema, which Supabase grants to the
  `authenticated` role as far as we know. Check it when the migrations first run on
  a real project.
- Voice dictation into the search box needs no server work.
