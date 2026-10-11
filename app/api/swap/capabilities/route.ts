import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sonus deliberately selects Circle's App Kit as its swap integration.
 *
 * This endpoint reports the real integration boundary; it does not fabricate
 * a quote or imply that a browser-connected wallet can currently execute swaps.
 * Arc/Circle first-party swap is server-side only today and requires a server-side
 * wallet adapter plus a Circle API/Kit key. Never add a user's private key here.
 */
export async function GET() {
  return NextResponse.json({
    provider: {
      id: "arc-circle-first-party-swap",
      name: "Arc/Circle first-party swap (verification required)",
      docs: "https://docs.arc.network/app-kit"
    },
    status: "not_ready",
    quoteAvailable: false,
    executionAvailable: false,
    reason: "The public Arc App Kit documentation currently verifies bridge functionality, not a same-chain swap API. Arc Portal's FAQ says its swap token availability is sourced by LI.FI, so that Portal route is not a Circle-owned swap provider. Sonus has no verified first-party swap API to call yet; keep quotes and execution disabled rather than silently use a third-party route or a Sonus-controlled wallet.",
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
      "Verify an official Arc/Circle same-chain swap API and its supported chains, tokens, and authorization model",
      "A clearly disclosed wallet model compatible with the verified first-party swap API",
      "Quote preview with estimated output, minimum received, fees, and slippage",
      "A separate execution design that preserves user authorization and never stores user private keys",
      "Automated tests for unsupported pairs, provider errors, quote expiry, and transaction status"
    ],
    checkedAt: new Date().toISOString()
  }, {
    headers: { "Cache-Control": "no-store" }
  });
}
