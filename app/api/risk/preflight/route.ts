import { NextResponse } from "next/server";
import { evaluateRiskPayload, parseRiskPayload } from "@/lib/risk-preflight.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let raw: string;
  try { raw = await request.text(); }
  catch { return NextResponse.json({ error: "Could not read request body." }, { status: 400 }); }

  const parsed = parseRiskPayload(raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, {
      status: parsed.status,
      headers: { "Cache-Control": "no-store" }
    });
  }
  return NextResponse.json({
    ...evaluateRiskPayload(parsed.body),
    checkedAt: new Date().toISOString()
  }, { headers: { "Cache-Control": "no-store" } });
}
