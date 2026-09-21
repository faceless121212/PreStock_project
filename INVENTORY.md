# Stack Inventory — PreStocks Recent Buys

Decisions made while scoping the hackathon build, and why. Read this before
changing the runtime, hosting, or data layer — it explains the trade-offs
behind choices that otherwise look inconsistent with the original task brief.

## Goal recap

Turn the static `prestocks-recent-buys.html` prototype into a working
Next.js app: real live prices from the PreStocks API, a real "recent buys"
feed sourced from on-chain Solana swaps, and a news-trigger banner — same
visual design, unchanged.

## Hosting: Vercel (serverless)

Chosen over a single long-running Node server because that's where the
user wants to see this deployed and demoed. This is the one decision that
forces every other deviation below — serverless functions are ephemeral
(no shared memory between invocations, no persistent connections), so the
brief's original "one persistent process holds everything in memory"
design doesn't fit as written.

## Data layer: Upstash Redis (thin shared cache, not a real datastore)

The brief says "no database in this pass" — true in spirit: Redis here is
not a domain model, it's a drop-in replacement for the in-memory cache and
ring buffer the brief assumed a single process would hold, made necessary
because Vercel gives us many short-lived processes instead of one. Holds:
- latest price snapshot (+ `staleSince`)
- the 50-entry buy ring buffer
- wallet-dedupe timestamps (TTL'd)

Chosen over Postgres/similar because it's serverless-native, has a free
tier, and everything we store is cache-shaped (small, TTL'd, no queries
beyond "give me the list" / "have I seen this wallet recently").

**Status: not yet provisioned.** V1 ships without it (see Phasing below);
needed before the real on-chain feed goes live.

## Price polling: Next.js fetch cache → Vercel Cron + Redis (phase 2)

**V1:** `/api/prices` fetches `https://prestocks.com/api/prestocks`
directly using Next's built-in `fetch` cache (`revalidate: 60`), which
Vercel persists across invocations for us. No Redis needed yet — this
alone satisfies "poll every 60s, serve cached result" for a first
deployable version.

**Phase 2:** once Redis is provisioned, move to a Vercel Cron job hitting
`/api/cron/poll-prices` every 1 minute (Vercel Cron's minimum interval),
writing into Redis, so `/api/prices` can add the stale-cache-fallback
behavior the brief specifies (serve last-good data + `staleSince` on
upstream failure) — Next's fetch cache alone can't express "keep serving
old data forever if fetches keep failing."

## On-chain buy feed: polling, not `connection.onLogs`

The brief asks for a persistent `onLogs` WebSocket subscription per mint.
That needs a long-lived connection, which serverless functions cannot
hold. Substituting: a Vercel Cron job polls `getSignaturesForAddress` per
mint every 20–30s, fetches new signatures via `getParsedTransaction`,
classifies buy/sell from token balance deltas, applies the `$25` minimum
and wallet-dedupe filters (state in Redis), and appends qualifying buys to
the Redis ring buffer. Same filters, same output shape, same real
on-chain data — different transport (pull instead of push), and it drops
the reconnect/backoff complexity the brief calls out, which also fits the
"MVP first" scope.

**Status: deferred past V1.** Needs Redis + a `SOLANA_RPC_URL` key first
(see Open items). V1 ships with the prototype's original client-side
simulated feed, clearly labeled as a placeholder, so the visual port and
live prices can be verified end-to-end on Vercel before wiring Solana in.

## Delivery to the browser: SSE via Edge runtime

`/api/feed/stream` as an Edge function — Vercel's Edge runtime supports
long-lived streaming responses, unlike standard serverless functions.
Sends the current Redis ring-buffer contents on connect, then polls Redis
server-side every few seconds and streams new entries. Same client
contract as the brief (SSE, buffer-then-stream); ships in the same phase
as the real on-chain feed.

## Frontend: Next.js 14 App Router, TypeScript, plain CSS

Per the brief: no Tailwind, no component library. The prototype's CSS
custom properties, font pairing (Space Grotesk + IBM Plex Mono), and
markup structure are ported as-is into CSS Modules — see
`/reference/prestocks-recent-buys.html` for the exact spec.

## Phasing

| Phase | Ships | Needs |
|---|---|---|
| V1 (this PR) | Ported UI, real live prices (`/api/prices`), news seed rotation, buy links from real `external_url` | Nothing external — deployable immediately |
| Phase 2 | Real on-chain buy feed (polling), SSE stream, wash-trade filters, stale-price fallback via Redis | Upstash Redis project, `SOLANA_RPC_URL` |
| Phase 3 (stretch) | Acceptance-criteria tests from the brief (subscribed-set test, dedupe test, min-USD test) | Phase 2 complete |

## Open items

- **Upstash Redis**: not yet provisioned — needed before Phase 2.
- **`SOLANA_RPC_URL`**: no provider key yet. Recommend Helius (free tier
  supports the RPC methods we need: `getSignaturesForAddress`,
  `getParsedTransaction`). QuickNode is an equally valid alternative.
- **Vercel project**: not yet linked to this repo. See `README.md` for the
  one-time import step.
