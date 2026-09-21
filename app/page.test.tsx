import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import Home from "./page";

const fakeTokens = [
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
  },
  {
    name: "OpenAI",
    symbol: "OPENAI",
    contract_address: "0xdef",
    markPrice: 50,
    markValuation: 500_000_000_000,
    tokenPrice: 50,
    impliedValuation: 500_000_000_000,
    supply: 10_000_000_000,
    external_url: "https://prestocks.com/openai",
  },
  {
    name: "SpaceX",
    symbol: "SPACEX",
    contract_address: "0xghi",
    markPrice: 200,
    markValuation: 400_000_000_000,
    tokenPrice: 200,
    impliedValuation: 400_000_000_000,
    supply: 2_000_000_000,
    external_url: "https://prestocks.com/spacex",
  },
];

describe("Home", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ tokens: fakeTokens, staleSince: null }),
      }),
    );
  });

  afterEach(() => {
    // Unmount first so the component's own effect cleanups clear its
    // setInterval/setTimeout timers (price polling, news rotation, buy-feed
    // simulation) before we tear down the fetch stub — avoids leaving open
    // handles that could hang the vitest process.
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders without throwing and shows fetched token data", async () => {
    const { unmount } = render(<Home />);

    expect(screen.getByText("Recent activity")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText("ANTHROPIC").length).toBeGreaterThan(0);
    });

    unmount();
  });
});
