# 0008: Magic link login

Status: accepted

## Context

The only admin is not technical and uses a phone. Many mail apps open links in
an in-app browser, which is a different browser from the one that asked for the
link.

## Decision

- Sign in with an emailed link, no password (see D-008).
- The link goes to `/auth/confirm?token_hash=...&type=...` and the server calls
  `verifyOtp`. This works in any browser. The PKCE `code` flow was rejected
  because its verifier cookie lives in the browser that requested the link.
- Only `email`, `magiclink` and `invite` link types are accepted.
- Requests never create users (`shouldCreateUser: false`) and the form answers
  "sent" for unauthorised addresses so it does not reveal who has access.
  Rate limits, server errors and network failures answer "try later".
- Session refresh and the `/admin` guard live in `src/proxy.ts` (Next.js 16
  renamed middleware to proxy). The admin page also checks the user, so it stays
  safe without the proxy.
- The app uses the new publishable key. The legacy `anon` and `service_role`
  keys and the secret key are not used; the env loader rejects a secret key.
- The logic is plain functions with an injected client (`src/lib`) and is unit
  tested. Supabase and Next glue lives in `src/server/supabase`, route handlers,
  pages and the proxy, and is covered by manual and later end-to-end checks.

## Consequences

- The Supabase email templates must be edited once (see README).
- Supabase's built-in email service cannot send to the owner's father; a custom
  SMTP provider is needed before he can log in.
- A real login still has to be tried against a real Supabase project.
