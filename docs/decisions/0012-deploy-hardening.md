# 0012: Deployment hardening and hosting

Status: accepted

## Context

The first Vercel deployment had no environment variables and answered 500 on every
page, including the login, because the route guard read the Supabase settings on
every request and threw when they were missing.

## Decision

- A failing session check (missing settings, Supabase down) no longer crashes the
  site: `sessionOrSignedOut` treats the visitor as signed out and logs the reason.
  Public pages and the login still render, and `/admin` redirects to the login, so
  protected pages stay closed.
- The login request treats a client that cannot be created as "try later".
- Email addresses longer than 254 characters are refused before the pattern runs, so
  a huge input cannot make the check slow.
- Hosting: decision D-009 chose the free Vercel plan, but as far as we know that plan
  is for non-commercial use. Before customers use the site, pick the Pro plan,
  another host, or Docker on our own server; the app is a standard Next.js build and
  can run in a container.

## Consequences

- A misconfigured deployment now shows up as a login that cannot send links and a
  log line, not as a blank error page. Check the runtime logs.
- `/auth/confirm` still answers 500 without settings; there is nothing it could do.
