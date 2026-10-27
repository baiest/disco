# Disco

Smart catalog for a physical record store. Mobile-first tools to register,
price and publish records without spreadsheets.

## Status

Phase 1 (simple record registration) is in progress. See
[AGENTS.md](./AGENTS.md) for how the project is developed and
[docs/decisions](./docs/decisions) for the decision records.

## Local setup

Requirements: Node 22 (see `.nvmrc`) and pnpm 10 (`corepack enable`).

```bash
pnpm install
git config core.hooksPath .githooks   # one time: commit and push checks
pnpm dev                              # http://localhost:3000
```

Quality gates, also run in CI: `pnpm lint`, `pnpm typecheck`, `pnpm test`,
`pnpm build`, `pnpm audit:high`.

## Languages

The interface is in Spanish today and ready for more languages with `next-intl`.
To add one (for example English): copy `apps/web/messages/es.json` to
`apps/web/messages/en.json`, translate every text keeping the `{placeholders}`,
and add `"en"` to `apps/web/src/i18n/locales.ts`. The language comes from the
`NEXT_LOCALE` cookie, then the browser language, then Spanish. A test fails if a
language file misses a key or a placeholder.

## Database

The schema lives in `supabase/migrations` (records, record media with photos and
videos, row level security and a private `record-photos` storage bucket). The rules are tested
in `packages/db` against a throw-away PostgreSQL database:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres pnpm --filter @disco/db test
```

Without `DATABASE_URL` the database tests are skipped locally; in CI they are
required. The tests use small stand-ins for Supabase Auth and Storage, so they
check the schema, constraints and policies but not the real Supabase services.
Before relying on them in production, try the migrations on a real Supabase
project (`supabase db push`) and test a magic-link login and a photo upload.

## Login (Supabase Auth)

Admins sign in with a link sent by email: no password. Setup on the Supabase
project (Authentication):

1. Sign In / Providers: turn off *Allow new users to sign up* and add the admin
   with *Users > Add user* or *Invite user*.
2. URL Configuration: set *Site URL* to the app URL (`http://localhost:3000`
   while developing).
3. Email Templates: in *Magic Link* (and *Invite user*) point the link to the
   app so it works in any browser, including the in-app browser of a mail app:

   ```html
   <h2>Entrar a Disco</h2>
   <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Entrar</a></p>
   ```

   For the *Invite user* template use `type=invite` instead of `type=email`.
4. Before the owner's father can log in, set up a custom SMTP provider
   (Authentication > Emails > SMTP Settings). Supabase's built-in email service
   only delivers to project team members and is limited to a few emails per
   hour.

Local run: copy `apps/web/.env.example` to `apps/web/.env.local` and fill in the
project URL and the **publishable** key (`sb_publishable_...`). Never use the
legacy `anon`/`service_role` keys or the secret key in the app. Open the link on
the same machine that runs `pnpm dev`, because it points to `localhost`.

## Repository settings (owner, one time)

The CI workflow must have run at least once before `main` can require its
checks.

1. Settings > Code security: enable secret scanning and push protection.
2. Settings > Rules > Rulesets > New ruleset > Import a ruleset, and choose
   `.github/rulesets/main.json`. It requires pull requests, merge commits
   (no squash) and the four CI checks, and blocks force pushes and deletion. There are no bypass actors, so it also applies to admins.

## License

Copyright (c) 2026. All rights reserved.

This repository is public so the work can be seen, but it is not open source.
There is no license: you may not copy, modify, distribute or use this code
without explicit written permission from the owner.
