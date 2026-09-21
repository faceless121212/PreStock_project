import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPrestocksTokens, type PrestocksToken } from "./prestocks-api";

function makeToken(overrides: Partial<PrestocksToken> = {}): PrestocksToken {
  return {
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
    ...overrides,
  };
}

describe("fetchPrestocksTokens", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves the parsed array on a 200 response with an array body", async () => {
    const tokens = [makeToken()];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(tokens),
      }),
    );

    await expect(fetchPrestocksTokens()).resolves.toEqual(tokens);
  });

  it("throws when res.ok is false", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.resolve([]),
      }),
    );

    await expect(fetchPrestocksTokens()).rejects.toThrow("PreStocks API responded with 503");
  });

  it("throws when the body isn't an array", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ not: "an array" }),
      }),
    );

    await expect(fetchPrestocksTokens()).rejects.toThrow(
      "PreStocks API returned an unexpected response shape",
    );
  });
});
