# AGENTS.md

Single source of truth for developing on Disco: humans and coding agents alike.
Product decisions live in `docs/decisions/`. This file covers how work gets
done and merged.

## 1. What Disco is

A smart catalog for a physical record store. The owner sells vinyl and CDs
through WhatsApp and Facebook Messenger, has a very large and disorganised
inventory, and is not comfortable with spreadsheets or admin tools.

Disco adapts to how he already works instead of forcing a new process:

- Register records from a phone with photos and as little typing as possible.
- Publish a public, shareable catalog so customers stop asking the same
  questions.
- Change prices and availability in a few taps.
- Later: answer customer queries automatically, locate records by voice, and
  add physical locations progressively.

The work is split into phases. **Only the current phase is implemented.** Do not
build features from future phases, even if they look convenient.

| Phase | Goal | Status |
|---|---|---|
| 1 | Simple record registration (photos, drafts, price, status) | Current |
| 2 | Public catalog, search, share links, WhatsApp button | Planned |
| 3 | Query automation (WhatsApp Business Platform, Messenger) | Planned |
| 4 | Voice assistant | Planned |
| 5 | Progressive inventory organisation (shelves, QR) | Planned, needs validation of 1-4 |

## 2. Product principles

1. Mobile-first: the admin UI must work very well on a phone.
2. Extreme simplicity: big buttons, few fields, short flows.
3. No technical knowledge and no spreadsheets required.
4. Incomplete data is valid. A record can exist without location, genre or an
   exact identification.
5. Prefer photos and voice over manual typing.
6. AI may propose data. It must never invent prices, availability or locations.
7. Important operations can be confirmed, corrected and undone where it makes
   sense.
8. The public catalog is simple, fast and easy to share by link.
9. Validating with the real business beats shipping more features.

## 3. Stack

| Area | Choice |
|---|---|
| Web | Next.js (App Router), React, TypeScript (strict), Tailwind CSS |
| Data | Supabase: PostgreSQL, Storage, Auth |
| Tests | Vitest + Testing Library; Playwright for critical end-to-end flows |
| Monorepo | pnpm workspaces |
| Backend | Next.js server code and Supabase only. No Rust, no microservices |

No new dependency or external service without a concrete reason written in the
PR description. Prefer the platform and the standard library.

## 4. Repo layout

```text
apps/
  web/              # Next.js app (admin and, later, public catalog)
packages/
  config/           # Shared tsconfig, eslint and vitest configuration
  domain/           # Pure business logic and types, no framework imports
supabase/
  migrations/       # SQL migrations (only created on explicit request)
docs/
  decisions/        # Decision records (ADRs)
scripts/            # check_*.sh used by the pipeline and the git hooks
```

Rules:

- Business logic lives in `packages/domain` and is tested without React or
  Supabase.
- UI components are shared inside `apps/web`; do not duplicate a component.
- Reuse before writing. Check existing helpers and components first.
  Duplicated logic is a review blocker.
- Do not add abstractions for needs that do not exist yet.

## 5. Language: English only

Everything committed is in English: code, identifiers, comments, commit
messages, PR titles and descriptions, docs, log and error messages, branch
names, test names.

User-facing UI copy is the one exception: the app is used by Spanish speakers,
so UI strings are in Spanish and kept in one place per app so they can be
translated later. Conversations with an assistant can be in any language.

## 6. TDD

Write the test first. Red, green, refactor.

- Test business logic first, then implement it. Co-locate tests next to the
  code (`price.ts` and `price.test.ts`).
- Prioritise application and integration tests over trivial UI or
  internal-structure tests.
- Coverage thresholds (80% lines, functions, branches and statements) are a
  consequence of TDD. Tests written afterwards only to satisfy the gate are
  not acceptable.
- A task is not done until the relevant tests and type checks have been run and
  pass. Never say something works without having verified it.

## 7. Quality gates

All of these run in CI and in the local hooks. A warning is a failure.

- LF line endings everywhere.
- `eslint --max-warnings=0`.
- `tsc --noEmit` in strict mode.
- `vitest run --coverage` with 80% global thresholds.
- Dependency audit at high severity.
- Secret scanning. No secrets, tokens or credentials in the repo, ever.
  Configuration goes through environment variables with a committed
  `.env.example` that contains no real values.
- Commit message format check (section 8).

## 8. Commit format

```text
[Action]: short title (max 72 chars)

What:
- what changed

Why:
- why it changed

DISCO-<n>
```

Allowed actions: `Add`, `Fix`, `Cut`, `Optimise`, `Refactor`, `Delete`, `Docs`,
`Style`, `Merge`.

Rules:

1. Title is `[Action]: description` with an allowed action.
2. Blank line after the title.
3. `What:` and `Why:` sections with `- ` bullets.
4. Ticket ID alone on the last line, no label.
5. ASCII only: no accented characters or typographic punctuation.
6. **No attribution trailers of any kind.** No `Co-Authored-By`,
   `Signed-off-by`, `Claude-Session`, `Generated with`, and no
   "contributed by" or tool-attribution lines in commits, PR descriptions,
   code or docs. This applies to coding agents too: if a tool injects such a
   line, remove it before committing.

## 9. Workflow

1. Branch `DISCO-<n>-<slug>` off `main`. Never commit directly to `main`.
2. Write tests first, then the implementation. Keep tasks small.
3. Commit following section 8.
4. Open a PR using `.github/pull_request_template.md`. Describe the change and
   how to verify it.
5. CI must be green and the PR approved before merge. Merge by squash.
6. Never force-push to `main`.

Before writing code for a new phase or feature: inspect the repo, present a
short proposal, and wait for agreement if the decision is not obvious.

Never create database migrations unless explicitly requested. When asked, name
them `YYYYMMDDHHMMSS_<slug>.sql`.

Record every important decision in `docs/decisions/NNNN-title.md` (context,
decision, consequences) and mirror it in the project decision log document.

## 10. Repository policy

- The repository is public but **not open source**. There is no LICENSE file on
  purpose: all rights are reserved. Do not add a license, and do not copy
  third-party code whose license conflicts with that.
- `main` is protected: pull request required, required status checks, linear
  history, no force pushes, no deletions, and the rules also apply to admins.
- Enable secret scanning and push protection on the repository.

## 11. Common commands

| Command | What it does |
|---|---|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Run the web app locally |
| `pnpm lint` | ESLint, zero warnings |
| `pnpm typecheck` | TypeScript, strict |
| `pnpm test` | Vitest with coverage thresholds |
| `bash scripts/check_lf.sh` | Fail on CRLF |
| `bash scripts/check_commit.sh` | Validate commit messages |
