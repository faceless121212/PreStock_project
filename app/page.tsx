"use client";

import { useEffect, useRef, useState } from "react";
import { getActiveNews } from "@/lib/news-seed";
import type { PrestocksToken } from "@/lib/prestocks-api";

type TickerToken = PrestocksToken & { chgPct: number };

type FeedEntry = {
  id: string;
  symbol: string;
  name: string;
  amount: number;
  url: string;
  image: string;
  initial: string;
  ts: number;
};

/** One rotating banner slot — either a real news item or a "momentum" stat
 * derived from data already on the page (price movers, feed activity). Both
 * render through the same markup so the banner reads as one consistent
 * mechanic, not two bolted-together features. */
type BannerItem = {
  kind: "news" | "momentum";
  tag: string;
  headline: string;
  meta: string;
};

const NEWS = getActiveNews();
const NEWS_BANNER_ITEMS: BannerItem[] = NEWS.map((n) => ({
  kind: "news",
  tag: n.tag,
  headline: n.headline,
  meta: `${n.source} — ${n.symbol}`,
}));
const BUY_BUCKETS = [25, 50, 75, 100, 150, 200, 300, 500, 750, 1200];
const BANNER_ROTATE_MS = 8000;

function initialOf(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function biggestMoverItem(tokens: TickerToken[]): BannerItem | null {
  if (tokens.length === 0) return null;
  const top = tokens.reduce((a, b) => (Math.abs(b.chgPct) > Math.abs(a.chgPct) ? b : a));
  const sign = top.chgPct >= 0 ? "+" : "";
  return {
    kind: "momentum",
    tag: "Momentum",
    headline: `${top.symbol} is ${top.chgPct >= 0 ? "up" : "down"} ${sign}${top.chgPct.toFixed(1)}% since the last price update.`,
    meta: `Live from PreStocks — ${top.name}`,
  };
}

function mostActiveItem(feed: FeedEntry[], buyCount: number): BannerItem | null {
  if (feed.length === 0) return null;
  const counts = new Map<string, number>();
  for (const entry of feed) counts.set(entry.symbol, (counts.get(entry.symbol) ?? 0) + 1);
  let topSymbol = feed[0].symbol;
  let topCount = 0;
  for (const [symbol, count] of counts) {
    if (count > topCount) {
      topCount = count;
      topSymbol = symbol;
    }
  }
  return {
    kind: "momentum",
    tag: "Trending",
    headline: `${topSymbol} leads the feed with ${topCount} of the last ${feed.length} buys shown below.`,
    meta: `${buyCount} buys today across all tokens`,
  };
}

/** Interleaves news and momentum items so the rotation alternates between
 * the two mechanics rather than running through one type, then the other. */
function buildBannerItems(tokens: TickerToken[], feed: FeedEntry[], buyCount: number): BannerItem[] {
  const momentumItems = [biggestMoverItem(tokens), mostActiveItem(feed, buyCount)].filter(
    (item): item is BannerItem => item !== null,
  );
  const combined: BannerItem[] = [];
  const rounds = Math.max(NEWS_BANNER_ITEMS.length, momentumItems.length);
  for (let i = 0; i < rounds; i++) {
    if (NEWS_BANNER_ITEMS[i]) combined.push(NEWS_BANNER_ITEMS[i]);
    if (momentumItems[i]) combined.push(momentumItems[i]);
  }
  return combined.length > 0 ? combined : NEWS_BANNER_ITEMS;
}

function TokenBadge({ image, alt, initial }: { image: string; alt: string; initial: string }) {
  const [failed, setFailed] = useState(false);
  if (!image || failed) {
    return <div className="badge badge-fallback">{initial}</div>;
  }
  return (
    <div className="badge badge-icon">
      {/* Real per-token logos from the PreStocks API's `image` field. Plain
          <img>, not next/image: these are 34px badges from an external
          domain we don't control, and a plain onError fallback is simpler
          than configuring remotePatterns for one small icon. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt={alt} onError={() => setFailed(true)} />
    </div>
  );
}

function timeAgo(ts: number) {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 45) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function randomBucket() {
  return BUY_BUCKETS[Math.floor(Math.random() * BUY_BUCKETS.length)];
}

export default function Home() {
  const [tokens, setTokens] = useState<TickerToken[]>([]);
  const [staleSince, setStaleSince] = useState<number | null>(null);
  const [bannerIdx, setBannerIdx] = useState(0);
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [buyCount, setBuyCount] = useState(0);
  const [, forceTick] = useState(0);

  const prevPrices = useRef<Map<string, number>>(new Map());
  const tokensRef = useRef<TickerToken[]>([]);
  const seededRef = useRef(false);

  useEffect(() => {
    tokensRef.current = tokens;
  }, [tokens]);

  // Live prices, polled every 60s via /api/prices (see INVENTORY.md for the
  // caching/stale-fallback strategy behind that route).
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/prices");
        const data = await res.json();
        if (cancelled) return;
        const next: TickerToken[] = (data.tokens ?? []).map((t: PrestocksToken) => {
          const prev = prevPrices.current.get(t.symbol);
          const chgPct = prev ? ((t.markPrice - prev) / prev) * 100 : 0;
          prevPrices.current.set(t.symbol, t.markPrice);
          return { ...t, chgPct };
        });
        setTokens(next);
        setStaleSince(data.staleSince ?? null);
      } catch {
        // network hiccup on the client — keep showing whatever we already have
      }
    }

    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Banner rotation: alternates real news headlines with "momentum" stats
  // computed from live price/feed data (see buildBannerItems above).
  useEffect(() => {
    const id = setInterval(() => setBannerIdx((i) => i + 1), BANNER_ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  // V1 buy feed: simulated, same as the original prototype, but built from
  // the real live token list (real symbol/name/external_url). The real
  // on-chain feed is Phase 2 — see INVENTORY.md.
  useEffect(() => {
    if (tokens.length === 0 || seededRef.current) return;
    seededRef.current = true;

    const seeded: FeedEntry[] = Array.from({ length: 8 }).map((_, i) => {
      const t = tokens[Math.floor(Math.random() * tokens.length)];
      const minsAgo = (i + 1) * (1 + Math.floor(Math.random() * 3));
      return {
        id: `seed-${i}`,
        symbol: t.symbol,
        name: t.name,
        amount: randomBucket(),
        url: t.external_url,
        image: t.image,
        initial: initialOf(t.name),
        ts: Date.now() - minsAgo * 60_000,
      };
    });
    setFeed(seeded);
    setBuyCount(seeded.length);

    let timeoutId: ReturnType<typeof setTimeout>;
    function scheduleNext() {
      const delay = 3500 + Math.random() * 4000;
      timeoutId = setTimeout(() => {
        const pool = tokensRef.current;
        if (pool.length > 0) {
          const t = pool[Math.floor(Math.random() * pool.length)];
          const entry: FeedEntry = {
            id: `${Date.now()}-${Math.random()}`,
            symbol: t.symbol,
            name: t.name,
            amount: randomBucket(),
            url: t.external_url,
            image: t.image,
            initial: initialOf(t.name),
            ts: Date.now(),
          };
          setFeed((prev) => [entry, ...prev].slice(0, 20));
          setBuyCount((c) => c + 1);
        }
        scheduleNext();
      }, delay);
    }
    scheduleNext();
    return () => clearTimeout(timeoutId);
    // Intentionally only re-runs on the 0 -> populated transition (first
    // load); scheduleNext reads live data via tokensRef, not this closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens.length]);

  // Re-render "time ago" labels every 15s.
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  const bannerItems = buildBannerItems(tokens, feed, buyCount);
  const activeBanner = bannerItems[bannerIdx % bannerItems.length];

  return (
    <div className="site">
      <header className="site-nav">
        <div className="site-nav-left">
          <div className="logo-mark">P</div>
          <span className="logo-word">PreStocks</span>
          <span className="unofficial-badge">Unofficial demo</span>
          <nav className="nav-links">
            <a className="nav-link" href="https://prestocks.com/products" target="_blank" rel="noopener">
              Products
            </a>
            <span className="nav-link nav-link-static">Ecosystem</span>
            <span className="nav-link nav-link-static">FAQ</span>
          </nav>
        </div>
        <a className="buy-btn nav-cta" href="https://prestocks.com" target="_blank" rel="noopener">
          Get PreStocks
        </a>
      </header>

      <div className="page-container">
        <div className="page-intro">
          <div className="brand-row">
            <div className="brand">Recent activity</div>
            <div className="live-tag">
              <span className="pulse-dot" />
              live
            </div>
          </div>
          <div className="sub">What people are buying across all 8 PreStocks tokens, as it happens.</div>
        </div>

        <div className="card ticker-wrap">
          <div className="ticker-track">
            {[...tokens, ...tokens].map((t, i) => (
              <div className="tick" key={`${t.symbol}-${i}`}>
                <span className="sym">{t.symbol}</span>
                <span className="px mono">${t.markPrice.toFixed(2)}</span>
                <span className={`chg mono ${t.chgPct >= 0 ? "up" : "down"}`}>
                  {t.chgPct >= 0 ? "+" : ""}
                  {t.chgPct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="layout-grid">
          <div className="main-col">
            <div className="feed-head">
              <div className="feed-title">Recent buys</div>
              <div className="feed-count mono">{buyCount} today</div>
            </div>

            <div className="card">
              <ul className="feed">
                {feed.length === 0 && <li className="empty-state">Watching for activity…</li>}
                {feed.map((entry) => (
                  <li className="row" key={entry.id}>
                    <TokenBadge image={entry.image} alt={entry.name} initial={entry.initial} />
                    <div className="row-body">
                      <div className="row-line1">
                        Someone bought <span className="amt mono">${entry.amount}</span> of{" "}
                        <span className="sym-inline">{entry.symbol}</span>
                      </div>
                      <div className="row-line2">
                        <span className="timeago">{timeAgo(entry.ts)}</span>
                        <span>·</span>
                        <span>{entry.name}</span>
                      </div>
                    </div>
                    <a className="buy-btn" href={entry.url} target="_blank" rel="noopener">
                      Buy
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="side-col">
            {activeBanner && (
              <div className="card news-panel" key={bannerIdx}>
                <div className="news-label">Why now</div>
                <div className="news-item">
                  <div className="news-headline">
                    <span className="news-tag">{activeBanner.tag}</span> {activeBanner.headline}
                  </div>
                  <div className="news-meta">{activeBanner.meta}</div>
                </div>
              </div>
            )}

            <div className="card note">
              <strong>Demo feed.</strong> Prices and every &quot;Buy&quot; link are real — Buy opens that
              token&apos;s actual PreStocks page, using the <span className="mono">external_url</span> field the
              API already returns per token. The buy <em>events</em> themselves are simulated for preview;
              production reads real swap transactions from each token&apos;s Solana mint address instead (Phase 2
              — see <span className="mono">INVENTORY.md</span>). The news banner shows real, dated headlines for
              Anthropic as an example — production pulls these live per company from a news feed rather than
              hardcoding them. This page is an unofficial hackathon demo, not affiliated with or endorsed by
              PreStocks.
              {staleSince !== null && (
                <>
                  {" "}
                  <strong>Prices may be delayed</strong> — last confirmed update {timeAgo(staleSince)}.
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
