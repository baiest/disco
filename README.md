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

## Repository settings (owner, one time)

The CI workflow must have run at least once before `main` can require its
checks.

1. Settings > Code security: enable secret scanning and push protection.
2. Settings > Rules > Rulesets > New ruleset > Import a ruleset, and choose
   `.github/rulesets/main.json`. It requires pull requests, squash merges,
   linear history and the four CI checks, and blocks force pushes and
   deletion. There are no bypass actors, so it also applies to admins.

## License

Copyright (c) 2026. All rights reserved.

This repository is public so the work can be seen, but it is not open source.
There is no license: you may not copy, modify, distribute or use this code
without explicit written permission from the owner.
