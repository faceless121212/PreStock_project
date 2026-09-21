# CLAUDE.md

Context for whoever (human or Claude) works in this repo next. Read
`INVENTORY.md` alongside this file for the stack decisions and why they
diverge from the original task brief in places. Also see `AGENTS.md` —
Next.js's own generated file with version-specific API notes; it's
maintained automatically by `next dev`, don't hand-edit it.

## Goal

Turn the static prototype `reference/prestocks-recent-buys.html` into a
working Next.js app for a hackathon: real live prices from the PreStocks
API, a real "recent buys" feed sourced from on-chain Solana swap
transactions, and a news-trigger banner — keeping the prototype's exact
visual design unchanged. PreStocks is a platform for tokenized pre-IPO
stocks (`https://prestocks.com/products`); the 8 eligible tokens come only
from `GET https://prestocks.com/api/prestocks`.

## Scope

**In scope:**
- Porting the prototype's CSS tokens (light + dark), fonts (Space Grotesk
  + IBM Plex Mono), and markup structure exactly — no redesign.
- `/api/prices`: live prices from the real PreStocks API, with a stale
  fallback if the upstream fetch fails.
- A real recent-buys feed built from on-chain Solana swap activity for
  the 8 PreStocks mint addresses (fetched from the API, never
  hand-typed), filtered for wash-trading ($25 min notional, 5-minute
  wallet dedupe).
- A news banner backed by a typed seed array (`lib/news-seed.ts`),
  rotating every 6 seconds — seed data is the intended scope, not a
  placeholder for a missing feature.
- Every buy link (ticker + feed rows) uses the real `external_url` from
  the API response for that token — never constructed or guessed.

**Explicitly out of scope** (see original brief for full rationale):
- No wallet connection, Jupiter swap integration, or in-app trade
  execution — Buy always links out to PreStocks' own page.
- No user accounts, auth, or persistence beyond what the feed needs to
  function (see `INVENTORY.md` for why a thin Redis cache was added on
  top of the brief's original "no database" instruction).
- No live news-scraping pipeline.
- No Tailwind, no component library, no restyling.
- No token that isn't one of the 8 returned by the live PreStocks API —
  anywhere in the codebase, ever. Hard constraint, not a preference.

## Current phase

Shipping in phases (full breakdown in `INVENTORY.md`):
- **V1 (current):** ported UI, real live prices, news seed rotation, real
  buy links. The recent-buys feed still uses the prototype's original
  client-side simulated events, clearly labeled — this phase exists to
  get the real visual port and live-price pipeline verified on Vercel
  before Solana is wired in.
- **Phase 2:** real on-chain buy feed (polling-based, not `onLogs` — see
  `INVENTORY.md` for why), SSE delivery, wash-trade filters live.
- **Phase 3:** the acceptance-criteria tests from the original brief.

Don't build Phase 2/3 work into a PR labeled as V1 without flagging the
phase bump — check `INVENTORY.md`'s phasing table for what's expected
where.

## Affected area

Entire repo — this is a new project, not a change to something existing.
Layout: standard Next.js App Router (`app/`, `app/api/`, `lib/`), plus
`reference/` (the prototype, read-only — treat it as the frozen visual
spec, don't edit it) and `INVENTORY.md` (stack decisions).

## Design system

The visual design does **not** follow `/reference/prestocks-recent-buys.html`
(that prototype's dark gold/emerald theme was the original brief's spec).
It was superseded: the app now ports the real design tokens from
`https://prestocks.com/products` (font, colors, radius, shadow, spacing —
pulled from that page's live computed CSS) so the app reads as one of
PreStocks' own pages instead. Light-only — their site has no dark mode.
Tokens live in `app/globals.css` `:root`; don't reintroduce the
prototype's gold/emerald/dark-mode values without checking with the user
first, since dropping them was a deliberate, explicit request.

## Key constraint to remember

The brief's design assumed one long-running Node process. We're deploying
to Vercel instead, which is why the on-chain feed is polling-based and a
thin Redis cache stands in for what would've been plain in-memory state.
If a future task description says "add an `onLogs` subscription" or
"cache this in memory," check `INVENTORY.md` first — those instructions
predate the Vercel decision and need translating to fit it.
