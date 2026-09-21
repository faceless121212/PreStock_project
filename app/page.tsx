"use client";

import { useEffect, useRef, useState } from "react";
import { getActiveNews, type NewsItem } from "@/lib/news-seed";
import type { PrestocksToken } from "@/lib/prestocks-api";

type TickerToken = PrestocksToken & { chgPct: number };

type FeedEntry = {
  id: string;
  symbol: string;
  name: string;
  amount: number;
  url: string;
  initial: string;
  ts: number;
};

const NEWS = getActiveNews();
const BUY_BUCKETS = [25, 50, 75, 100, 150, 200, 300, 500, 750, 1200];

function initialOf(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
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
  const [newsIdx, setNewsIdx] = useState(0);
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

  // News banner rotation, every 6s — same cadence as the prototype.
  useEffect(() => {
    const id = setInterval(() => setNewsIdx((i) => i + 1), 6000);
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

  const news: NewsItem | undefined = NEWS[newsIdx % NEWS.length];

  return (
    <div className="shell">
      <header>
        <div className="brand-row">
          <div className="brand">Recent activity</div>
          <div className="live-tag">
            <span className="pulse-dot" />
            live
          </div>
        </div>
        <div className="sub">What people are buying across all 8 PreStocks tokens, as it happens.</div>
      </header>

      <div className="ticker-wrap">
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

      {news && (
        <div className="news-panel">
          <div className="news-label">Why now</div>
          <div className="news-item">
            <div className="news-headline">
              <span className="news-tag">{news.tag}</span> {news.headline}
            </div>
            <div className="news-meta">
              {news.source} — {news.symbol}
            </div>
          </div>
        </div>
      )}

      <div className="feed-head">
        <div className="feed-title">Recent buys</div>
        <div className="feed-count mono">{buyCount} today</div>
      </div>

      <ul className="feed">
        {feed.length === 0 && <li className="empty-state">Watching for activity…</li>}
        {feed.map((entry) => (
          <li className="row" key={entry.id}>
            <div className="badge">{entry.initial}</div>
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

      <div className="note">
        <strong>Demo feed.</strong> Prices and every &quot;Buy&quot; link are real — Buy opens that token&apos;s
        actual PreStocks page, using the <span className="mono">external_url</span> field the API already returns
        per token. The buy <em>events</em> themselves are simulated for preview; production reads real swap
        transactions from each token&apos;s Solana mint address instead (Phase 2 — see{" "}
        <span className="mono">INVENTORY.md</span>). The news banner shows real, dated headlines for Anthropic as
        an example — production pulls these live per company from a news feed rather than hardcoding them.
        {staleSince !== null && (
          <>
            {" "}
            <strong>Prices may be delayed</strong> — last confirmed update {timeAgo(staleSince)}.
          </>
        )}
      </div>
    </div>
  );
}
