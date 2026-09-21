import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrestocksToken } from "@/lib/prestocks-api";

vi.mock("@/lib/prestocks-api", () => ({
  fetchPrestocksTokens: vi.fn(),
}));

function makeTokens(): PrestocksToken[] {
  return [
    {
      name: "Anthropic",
      symbol: "ANTHROPIC",
      contract_address: "0xabc",
      markPrice: 100,
      markValuation: 965_000_000_000,
      tokenPrice: 100,
      impliedValuation: 965_000_000_000,
      supply: 9_650_000_000,
      external_url: "https://prestocks.com/anthropic",
      image: "https://www.prestocks.com/logos/anthropic.png",
    },
  ];
}

// The route module holds a module-level `lastGood` cache, so each test needs
// a fresh module instance (via vi.resetModules() + dynamic import) to avoid
// cache state leaking between tests. Within a single test, multiple GET()
// calls against the same imported module intentionally share that cache, so
// we can exercise the stale-fallback behavior.
describe("GET /api/prices", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns the parsed tokens with staleSince null on a fresh successful call", async () => {
    const tokens = makeTokens();
    const { fetchPrestocksTokens } = await import("@/lib/prestocks-api");
    vi.mocked(fetchPrestocksTokens).mockResolvedValueOnce(tokens);

    const { GET } = await import("./route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ tokens, staleSince: null });
  });

  it("falls back to the previously cached lastGood tokens with a non-null staleSince when a later call fails", async () => {
    const tokens = makeTokens();
    const { fetchPrestocksTokens } = await import("@/lib/prestocks-api");
    const { GET } = await import("./route");

    // First call succeeds and seeds the module-level lastGood cache.
    vi.mocked(fetchPrestocksTokens).mockResolvedValueOnce(tokens);
    const first = await GET();
    await first.json();

    // Second call fails; should fall back to the cached tokens.
    vi.mocked(fetchPrestocksTokens).mockRejectedValueOnce(new Error("network down"));
    const second = await GET();
    const body = await second.json();

    expect(second.status).toBe(200);
    expect(body.tokens).toEqual(tokens);
    expect(body.staleSince).not.toBeNull();
    expect(typeof body.staleSince).toBe("number");
  });

  it("returns a 502 with empty tokens when the very first call ever rejects (no lastGood yet)", async () => {
    const { fetchPrestocksTokens } = await import("@/lib/prestocks-api");
    vi.mocked(fetchPrestocksTokens).mockRejectedValueOnce(new Error("network down"));

    const { GET } = await import("./route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.tokens).toEqual([]);
    expect(body.staleSince).toBeNull();
    expect(typeof body.error).toBe("string");
  });

  it("does not leak lastGood cache state across module instances between tests", async () => {
    // Regression guard for the case above: if this test ran right after the
    // stale-fallback test but resetModules()/dynamic import didn't actually
    // isolate the cache, a first-ever rejection here would incorrectly
    // return a cached fallback instead of a 502.
    const { fetchPrestocksTokens } = await import("@/lib/prestocks-api");
    vi.mocked(fetchPrestocksTokens).mockRejectedValueOnce(new Error("still down"));

    const { GET } = await import("./route");
    const res = await GET();
    expect(res.status).toBe(502);
  });
});
