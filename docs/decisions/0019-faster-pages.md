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

## Update: a screen appears the instant it is tapped

Tapping a button still felt slow: nothing changed on screen until the server had finished the whole next
page. Now the main routes have a loading screen (`loading.tsx`, built from `PageSkeleton`): the admin screens,
the public record and the public catalog show a placeholder at once, and Next prepares those routes ahead
from the links on screen.

- The admin list and the record page ask for the session check, the data and the texts together instead of
  the check first and the data after. The proxy still redirects signed out visitors; nothing is shown before
  the check passes.
- On the publish screen the files of the post are downloaded all at once (they already were) and the button
  shows how many are ready ("Preparando 2 de 5…"), instead of a fixed "Preparando…".
- Not measured: these changes were not timed against the real Supabase project and Vercel, so how much faster
  it feels has to be judged on the phone.

Still to do, because they are the bigger costs: small versions of the pictures (lists still download the
original photos, see 0018) and checking in Supabase (Settings > JWT Keys) that the project signs tokens with
asymmetric keys, so the session check never has to call the Auth server.
