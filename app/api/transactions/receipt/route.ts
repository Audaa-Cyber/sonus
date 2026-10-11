import { NextResponse } from "next/server";
import { classifyReceipt, isTransactionHash } from "@/lib/arc-receipt.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RPC_URL = "https://rpc.testnet.arc.network";
const CHAIN_ID = "0x4cef52";

async function rpc(method: string, params: unknown[]) {
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
    signal: AbortSignal.timeout(7_000)
  });
  if (!response.ok) throw new Error("Arc RPC request failed.");
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object") throw new Error("Invalid Arc RPC response.");
  const data = payload as { result?: unknown; error?: { message?: string } };
  if (data.error || !("result" in data)) throw new Error(data.error?.message || "Invalid Arc RPC result.");
  return data.result;
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const hash = url.searchParams.get("hash") || "";
  if (!isTransactionHash(hash)) return error("Provide a valid 32-byte transaction hash.", 400);

  try {
    const [chainId, receipt, latestBlock] = await Promise.all([
      rpc("eth_chainId", []),
      rpc("eth_getTransactionReceipt", [hash]),
      rpc("eth_blockNumber", [])
    ]);
    if (typeof chainId !== "string" || chainId.toLowerCase() !== CHAIN_ID) {
      return error("The configured RPC did not identify itself as Arc Testnet.", 502);
    }

    const result = classifyReceipt(hash, receipt, latestBlock);
    if (result.status === "unknown") {
      return NextResponse.json({ error: "Arc RPC returned an unrecognized receipt response." }, {
        status: 502,
        headers: { "Cache-Control": "no-store" }
      });
    }

    return NextResponse.json({
      ...result,
      network: "Arc Testnet",
      chainId: 5042002,
      source: "Arc Testnet RPC",
      checkedAt: new Date().toISOString(),
      caveat: "This is a point-in-time receipt check, not a finality or reorganization guarantee. Verify the transaction in Arcscan if the result matters."
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    console.error("Sonus receipt lookup failed", cause);
    return error("Arc Testnet receipt lookup is temporarily unavailable. Try again shortly.", 502);
  }
}
