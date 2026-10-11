import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sonus deliberately selects Circle's App Kit as its swap integration.
 *
 * This endpoint reports the real integration boundary; it does not fabricate
 * a quote or imply that a browser-connected wallet can currently execute swaps.
 * Circle App Kit Swap is server-side only today and requires a server-side
 * wallet adapter plus a Circle API/Kit key. Never add a user's private key here.
 */
export async function GET() {
  return NextResponse.json({
    provider: {
      id: "circle-app-kit",
      name: "Circle App Kit Swap",
      docs: "https://docs.arc.network/app-kit"
    },
    status: "not_ready",
    quoteAvailable: false,
    executionAvailable: false,
    reason: "Circle App Kit Swap requires a server-side wallet adapter. Sonus currently connects user-controlled browser wallets, and must not ask users to upload private keys or silently swap from a Sonus-controlled wallet.",
    supportedEnvironment: {
      arcTestnet: {
        chain: "Arc_Testnet",
        supportedTokens: ["USDC", "EURC", "CIRBTC"],
        caveat: "Testnet liquidity is limited; routes may be unavailable or revert."
      },
      arcMainnet: {
        chain: "Arc",
        supportedTokens: "Confirm current Circle App Kit supported-token matrix before enabling."
      }
    },
    nextRequirements: [
      "Circle App Kit integration and server-only API credential configuration",
      "A clearly disclosed wallet model compatible with Circle App Kit Swap",
      "Quote preview with estimated output, minimum received, fees, and slippage",
      "A separate execution design that preserves user authorization and never stores user private keys",
      "Automated tests for unsupported pairs, provider errors, quote expiry, and transaction status"
    ],
    checkedAt: new Date().toISOString()
  }, {
    headers: { "Cache-Control": "no-store" }
  });
}
