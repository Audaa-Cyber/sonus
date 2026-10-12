import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const MAX_SESSIONS_PER_WINDOW = 8;
const requestsByClient = new Map<string, { count: number; resetAt: number }>();

function getClientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(request: Request) {
  const now = Date.now();
  for (const [key, entry] of requestsByClient) {
    if (entry.resetAt <= now) requestsByClient.delete(key);
  }
  const key = getClientKey(request);
  const current = requestsByClient.get(key);
  if (!current || current.resetAt <= now) {
    requestsByClient.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > MAX_SESSIONS_PER_WINDOW;
}

function hasAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

function realtimeEnabled() {
  return Boolean(process.env.OPENAI_REALTIME_API_KEY) && process.env.OPENAI_REALTIME_ENABLED === "true";
}

export async function GET() {
  return NextResponse.json({
    enabled: realtimeEnabled(),
    model: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2.1",
    mode: realtimeEnabled() ? "realtime" : "browser",
    reason: !process.env.OPENAI_REALTIME_API_KEY
      ? "A dedicated OpenAI Realtime API key is not configured."
      : process.env.OPENAI_REALTIME_ENABLED !== "true"
        ? "Realtime voice is disabled until explicitly enabled on the server."
        : undefined,
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!hasAllowedOrigin(request)) {
    return NextResponse.json({ error: "Cross-origin voice sessions are not allowed." }, { status: 403 });
  }
  if (isRateLimited(request)) {
    return NextResponse.json({ error: "Too many voice sessions. Wait a minute and try again." }, { status: 429 });
  }
  const apiKey = process.env.OPENAI_REALTIME_API_KEY;
  if (!apiKey || process.env.OPENAI_REALTIME_ENABLED !== "true") {
    return NextResponse.json({ error: "Realtime voice is disabled. Configure OPENAI_REALTIME_API_KEY and explicitly set OPENAI_REALTIME_ENABLED=true after reviewing access controls." }, { status: 503 });
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/sdp")) {
    return NextResponse.json({ error: "Expected an SDP offer." }, { status: 415 });
  }
  const sdp = await request.text();
  if (!sdp || sdp.length > 100_000) {
    return NextResponse.json({ error: "Invalid or oversized SDP offer." }, { status: 413 });
  }

  const session = {
    type: "realtime",
    model: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2.1",
    instructions: [
      "You are Sonus, a warm and concise voice assistant. Speak naturally, like a helpful person, not a technical manual.",
      "Remember the conversation and understand follow-up requests. Take the next useful step instead of merely repeating the command.",
      "Never claim a payment was sent, a balance was checked, a live price was verified, or a transaction was simulated.",
      "You cannot access wallets or execute transactions. A separate Sonus review flow must prepare and display any payment draft.",
      "Saved contact names and recent conversation are supplied below. Recognize exact saved contact names. Never speak a full wallet address; use the saved contact name or say the recipient.",
      "Never infer or invent a wallet address from a name or social handle.",
      "Never ask for seed phrases, private keys, or wallet passwords.",
      "Sonus supports native USDC on Arc Testnet only (chain ID 5042002). This is the default and only network. Never ask which network or estimate fees; the wallet will show fees during approval.",
      "Do not claim swaps, bridges, staking, or external identity resolution are live.",
      "Saved contact names: " + JSON.stringify(contacts),
      "Recent conversation: " + JSON.stringify(history)
    ].join("\n"),
    audio: {
      input: {
        transcription: { model: "gpt-realtime-whisper" },
        turn_detection: { type: "semantic_vad", create_response: true, interrupt_response: true, eagerness: "medium" },
        noise_reduction: { type: "near_field" }
      },
      output: { voice: "marin" }
    }
  };

  const form = new FormData();
  form.set("sdp", sdp);
  form.set("session", JSON.stringify(session));

  try {
    const upstream = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey },
      body: form,
      signal: AbortSignal.timeout(20_000)
    });
    const answer = await upstream.text();
    if (!upstream.ok) {
      console.error("Sonus realtime session error", upstream.status, answer.slice(0, 400));
      return NextResponse.json({
        error: upstream.status === 401
          ? "Realtime API key was rejected. Check OPENAI_REALTIME_API_KEY."
          : upstream.status === 403
            ? "This API key or project does not have access to realtime voice."
            : "Realtime voice could not start. Check the model and API project settings."
      }, { status: 502 });
    }
    return new Response(answer, { status: 200, headers: { "Content-Type": "application/sdp", "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Sonus realtime session request failed", error);
    return NextResponse.json({ error: "Could not connect to the realtime voice service. Please retry." }, { status: 502 });
  }
}
