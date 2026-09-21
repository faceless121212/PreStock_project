export type NewsItem = {
  symbol: string;
  tag: string;
  headline: string;
  source: string;
};

// Real, dated, paraphrased headlines for Anthropic as an example seed.
// Phase 2 replaces the body of getActiveNews() with a live per-company
// news source — nothing outside this file should need to change when
// that happens.
const NEWS_SEED: NewsItem[] = [
  {
    symbol: "ANTHROPIC",
    tag: "Funding",
    headline: "Anthropic closed a $65B round in May at a $965B valuation.",
    source: "Bloomberg · May 28, 2026",
  },
  {
    symbol: "ANTHROPIC",
    tag: "IPO timing",
    headline: "Anthropic's planned listing slipped from October to November.",
    source: "WSJ · Sep 18, 2026",
  },
  {
    symbol: "ANTHROPIC",
    tag: "Revenue",
    headline: "Anthropic's annualized revenue is reported to have passed $100B as its IPO nears.",
    source: "via Bloomberg · Sep 18, 2026",
  },
];

export function getActiveNews(): NewsItem[] {
  return NEWS_SEED;
}
