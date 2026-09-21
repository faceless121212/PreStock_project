export type PrestocksToken = {
  name: string;
  symbol: string;
  contract_address: string;
  markPrice: number;
  markValuation: number;
  tokenPrice: number;
  impliedValuation: number;
  supply: number;
  external_url: string;
};

const PRESTOCKS_API_URL = "https://prestocks.com/api/prestocks";

export async function fetchPrestocksTokens(): Promise<PrestocksToken[]> {
  const res = await fetch(PRESTOCKS_API_URL, { next: { revalidate: 60 } });
  if (!res.ok) {
    throw new Error(`PreStocks API responded with ${res.status}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("PreStocks API returned an unexpected response shape");
  }
  return data as PrestocksToken[];
}
