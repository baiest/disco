# 0019. Faster pages

## Context

Everything the owner tapped took a long time. Each page made several requests to Supabase one
after another (the route guard, the page, the repo, the pictures), and the Vercel functions ran
in the default US East region while the Supabase project is in US West (Oregon), so every
request crossed the country.

## Decision

- Pin the Vercel functions to Portland (`pdx1`, `apps/web/vercel.json`), next to Supabase.
- Check the session with `auth.getClaims()` instead of `auth.getUser()`. With asymmetric JWT
  signing keys it verifies the signed token locally; with a symmetric secret it falls back to a
  request to the Auth server, as before, so it is never less safe.
- Keep the signed in user's id for the whole request (`getCurrentUserId`, cached with React
  `cache`) so a page and the code it calls do not repeat the check.
- On the record detail, ask for the record and its files together and take the file count from
  the list, which removes two requests in a row.

## Consequences

- If the Supabase project moves region, `regions` must change with it.
- The saved session is still checked in the route guard on every request; only the cost of that
  check dropped.
- Pictures are still the original files (see 0018); small versions would be the next step.
