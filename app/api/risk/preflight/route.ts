import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const ZERO_ADDRESS = /^0x0{40}$/i;
const AMOUNT = /^(?:0|[1-9]\d{0,15})(?:\.\d{1,6})?$/;
const ARC_TESTNET_CHAIN_ID = 5042002;

type RiskRequest = {
  sender?: unknown;
  recipient?: unknown;
  amount?: unknown;
  asset?: unknown;
  network?: unknown;
  chainId?: unknown;
};

export async function POST(request: Request) {
  let body: RiskRequest;
  try {
    const raw = await request.text();
    if (raw.length > 8_000) return NextResponse.json({ error: "Request too large." }, { status: 413 });
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Expected a JSON object." }, { status: 400 });
    }
    body = parsed as RiskRequest;
  } catch {
    return NextResponse.json({ error: "Expected a JSON request." }, { status: 400 });
  }

  if (typeof body.sender !== "string" || typeof body.recipient !== "string" ||
      typeof body.amount !== "string" || typeof body.asset !== "string" ||
      typeof body.network !== "string" || typeof body.chainId !== "number") {
    return NextResponse.json({ error: "sender, recipient, amount, asset, network, and chainId are required." }, { status: 400 });
  }

  const checks: { code: string; severity: "block" | "warning"; message: string }[] = [];
  if (!ADDRESS.test(body.sender)) checks.push({ code: "invalid_sender", severity: "block", message: "The connected sender address is malformed." });
  if (!ADDRESS.test(body.recipient)) checks.push({ code: "invalid_recipient", severity: "block", message: "The recipient is not a valid 20-byte EVM address." });
  if (ADDRESS.test(body.recipient) && ZERO_ADDRESS.test(body.recipient)) checks.push({ code: "zero_address", severity: "block", message: "The zero address cannot receive a normal wallet payment." });
  if (ADDRESS.test(body.sender) && ADDRESS.test(body.recipient) && body.sender.toLowerCase() === body.recipient.toLowerCase()) {
    checks.push({ code: "self_transfer", severity: "block", message: "The recipient is the same as the sending wallet." });
  }
  if (!AMOUNT.test(body.amount) || !Number.isFinite(Number(body.amount)) || Number(body.amount) <= 0) {
    checks.push({ code: "invalid_amount", severity: "block", message: "Enter a positive amount with at most 6 decimal places." });
  }
  if (body.asset !== "USDC" || body.network !== "Arc Testnet" || body.chainId !== ARC_TESTNET_CHAIN_ID) {
    checks.push({ code: "unsupported_route", severity: "block", message: "This preflight only supports native USDC transfers on Arc Testnet (chain ID 5042002)." });
  }
  if (body.chainId === ARC_TESTNET_CHAIN_ID) {
    checks.push({ code: "testnet_asset", severity: "warning", message: "Arc Testnet balances are test assets, not real funds." });
  }
  if (ADDRESS.test(body.recipient) && !ZERO_ADDRESS.test(body.recipient)) {
    checks.push({ code: "identity_unverified", severity: "warning", message: "Address format does not verify the recipient's real-world identity or ownership." });
  }

  const blocked = checks.some(check => check.severity === "block");
  return NextResponse.json({
    status: blocked ? "blocked" : checks.some(check => check.severity === "warning") ? "review" : "clear",
    allowedToContinue: !blocked,
    scope: "deterministic_preflight_only",
    securityProviderConnected: false,
    checks,
    disclaimer: "This checks basic transaction parameters only. It does not scan phishing lists, token contracts, malicious activity, or simulate execution, and it cannot guarantee a transaction is safe.",
    checkedAt: new Date().toISOString()
  }, { headers: { "Cache-Control": "no-store" } });
}
