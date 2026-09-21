# PreStocks — Recent Activity

A Next.js port of the `prestocks-recent-buys.html` prototype for the
PreStocks (tokenized pre-IPO stocks) hackathon build. See `CLAUDE.md` for
goal/scope and `INVENTORY.md` for the stack decisions — in particular why
this targets Vercel with a polling-based on-chain feed instead of the
original brief's persistent `onLogs` subscription.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploying

This repo has no Vercel project linked yet. To deploy:

1. Go to [vercel.com/new](https://vercel.com/new) and import
   `faceless121212/PreStock_project`.
2. Leave the default Next.js build settings — no environment variables
   are required for V1 (see `.env.example` for what Phase 2 will need).
3. Deploy. Every push to `main` will auto-deploy after that.

## Known limitations (current phase)

- **News is seed data, not live.** `lib/news-seed.ts` ships with three
  real, dated Anthropic headlines as an example. A real news source can
  replace `getActiveNews()` without touching any UI code.
- **The "Recent buys" feed is simulated**, not yet sourced from on-chain
  Solana swaps. It uses the real live token list (real symbols, names,
  and `external_url` buy links) with simulated buy events — same as the
  original prototype's demo feed. The real on-chain feed (with the $25
  minimum and wallet-dedupe wash-trade filters) is Phase 2; see
  `INVENTORY.md`.
- **Price cache is best-effort in-memory**, not durable across cold
  starts on Vercel. Phase 2 moves this to a Redis-backed cache so the
  stale-price fallback works reliably.
