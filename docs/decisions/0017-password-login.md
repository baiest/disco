# 0017. Password login next to the emailed link

## Context

The emailed link (0008) depends on Supabase sending email. The default sender allows very
few messages per hour, so testing and daily use can be blocked until a custom SMTP is set up.

## Decision

- Add a password form to the login page, above the emailed link form, which stays.
- The server calls `signInWithPassword`; on success it redirects to `/admin`.
- Any refusal reads "wrong email or password", whether the email is unknown or the password
  is wrong, so the form does not reveal who has access. Rate limits, server errors and network
  failures read "try later".
- Sign ups stay disabled. The owner creates the user in the Supabase dashboard
  (Authentication > Users) and sets the password there; no password is ever written in the repo
  or in a chat.
- The password is stored and checked by Supabase Auth, never by this app.

## Consequences

- The owner has to remember a password; the emailed link remains as the no-password option.
- A weak password is the owner's risk; use a long, unique one.
- Supabase limits sign in attempts per address and IP, so guessing is slowed, not blocked.
