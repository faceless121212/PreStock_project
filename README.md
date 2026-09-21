

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
