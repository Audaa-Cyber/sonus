import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 60;

const COINS = [
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "usd-coin", symbol: "USDC", name: "USD Coin" }
] as const;

type CoinGeckoResponse = Record<string, { usd?: number; usd_24h_change?: number }>;

export async function GET() {
  try {
    const url = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum%2Csolana%2Cbitcoin%2Cusd-coin&vs_currencies=usd&include_24hr_change=true";
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 60 }
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: response.status === 429 ? "Market data provider is rate-limiting requests. Try again shortly." : "Market data provider is temporarily unavailable." },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }

    const data = await response.json() as CoinGeckoResponse;
    const assets = COINS.map(coin => {
      const quote = data[coin.id];
      const priceUsd = quote?.usd;
      const change24h = quote?.usd_24h_change;
      if (typeof priceUsd !== "number" || !Number.isFinite(priceUsd) || priceUsd <= 0 ||
          typeof change24h !== "number" || !Number.isFinite(change24h)) {
        throw new Error("Provider returned incomplete market data.");
      }
      return { ...coin, priceUsd, change24h };
    });

    return NextResponse.json(
      { assets, source: "CoinGecko", updatedAt: new Date().toISOString(), staleAfterSeconds: 60 },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" } }
    );
  } catch (error) {
    console.error("Sonus market data error", error);
    return NextResponse.json({ error: "Could not load live market data. Please retry shortly." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
