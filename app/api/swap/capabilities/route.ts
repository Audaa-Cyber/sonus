import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sonus is investigating a first-party Arc/Circle swap path.
 *
 * Public documentation reviewed so far verifies Circle App Kit bridging, not a
 * same-chain swap API. This endpoint reports that boundary without fabricating
 * quotes. Do not assume an API or wallet adapter exists until verified.
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
        supportedTokens: [],
        caveat: "First-party same-chain swap support and token availability are not verified."
      },
      arcMainnet: {
        chain: "Arc",
        supportedTokens: "Not verified"
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
