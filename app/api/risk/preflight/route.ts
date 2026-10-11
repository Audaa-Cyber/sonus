import { NextResponse } from "next/server";
import { evaluateRiskPayload, parseRiskPayload } from "@/lib/risk-preflight.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 8_000;

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

export async function POST(request: Request) {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength && Number(declaredLength) > MAX_BODY_BYTES) {
    return errorResponse("Request too large.", 413);
  }
  if (!request.body) return errorResponse("Expected a JSON request.", 400);

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let raw = "";
  let bytesRead = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > MAX_BODY_BYTES) {
        await reader.cancel("Request body exceeds the allowed size.");
        return errorResponse("Request too large.", 413);
      }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
  } catch {
    return errorResponse("Could not read request body.", 400);
  } finally {
    reader.releaseLock();
  }

  const parsed = parseRiskPayload(raw);
  if (!parsed.ok) return errorResponse(parsed.error, parsed.status);

  return NextResponse.json({
    ...evaluateRiskPayload(parsed.body),
    checkedAt: new Date().toISOString()
  }, { headers: { "Cache-Control": "no-store" } });
}
