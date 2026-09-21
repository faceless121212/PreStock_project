import { NextResponse } from "next/server";
import { fetchPrestocksTokens, type PrestocksToken } from "@/lib/prestocks-api";

// Best-effort fallback for a warm serverless instance only — not durable
// across cold starts. Phase 2 replaces this with a Redis-backed cache so
// the stale fallback survives instance recycling (see INVENTORY.md).
let lastGood: { tokens: PrestocksToken[]; fetchedAt: number } | null = null;

export async function GET() {
  try {
    const tokens = await fetchPrestocksTokens();
    lastGood = { tokens, fetchedAt: Date.now() };
    return NextResponse.json({ tokens, staleSince: null });
  } catch {
    if (lastGood) {
      return NextResponse.json({ tokens: lastGood.tokens, staleSince: lastGood.fetchedAt });
    }
    return NextResponse.json(
      { tokens: [], staleSince: null, error: "PreStocks API unreachable and no cached data yet" },
      { status: 502 },
    );
  }
}
