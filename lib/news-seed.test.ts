import { describe, expect, it } from "vitest";
import { getActiveNews } from "./news-seed";

describe("getActiveNews", () => {
  it("returns the seed array of news items", () => {
    const news = getActiveNews();
    expect(Array.isArray(news)).toBe(true);
    expect(news.length).toBe(3);
  });

  it("returns items with the expected shape", () => {
    const news = getActiveNews();
    for (const item of news) {
      expect(item).toHaveProperty("symbol");
      expect(item).toHaveProperty("tag");
      expect(item).toHaveProperty("headline");
      expect(item).toHaveProperty("source");
      expect(typeof item.symbol).toBe("string");
      expect(typeof item.tag).toBe("string");
      expect(typeof item.headline).toBe("string");
      expect(typeof item.source).toBe("string");
    }
  });

  it("currently seeds only ANTHROPIC headlines", () => {
    const news = getActiveNews();
    expect(news.every((item) => item.symbol === "ANTHROPIC")).toBe(true);
  });

  it("returns the same array contents on repeated calls", () => {
    expect(getActiveNews()).toEqual(getActiveNews());
  });
});
