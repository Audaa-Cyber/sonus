import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS = ["transfer", "swap", "bridge", "portfolio", "market", "risk", "education", "unknown"] as const;
const ASSETS = new Set(["USDC", "USDT", "ETH", "SOL", "BTC"]);
const CHAINS = new Set(["Arc Testnet", "Ethereum", "Arbitrum", "Base", "Solana", "unknown"]);

type AssistantIntent = {
  action: (typeof ACTIONS)[number];
  amount: string | null;
  asset: string | null;
  recipient: string | null;
  chain: string | null;
  purpose: string | null;
  needsClarification: boolean;
  clarificationQuestion: string | null;
};

type AssistantOutput = { reply: string; intent: AssistantIntent };

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;
const requestWindows = new Map<string, { startedAt: number; count: number }>();

function isRateLimited(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = forwarded || request.headers.get("x-real-ip") || "local";
  const now = Date.now();
  const current = requestWindows.get(key);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    if (!current && requestWindows.size >= 5_000) {
      const oldestKey = requestWindows.keys().next().value;
      if (oldestKey) requestWindows.delete(oldestKey);
    }
    requestWindows.set(key, { startedAt: now, count: 1 });
    return false;
  }
  current.count += 1;
  return current.count > MAX_REQUESTS_PER_WINDOW;
}

async function getLiveMarketSummary(): Promise<string | null> {
  try {
    const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum%2Csolana%2Cbitcoin%2Cusd-coin&vs_currencies=usd&include_24hr_change=true", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6_000),
      next: { revalidate: 60 }
    });
    if (!response.ok) return null;
    const data = await response.json() as Record<string, { usd?: number; usd_24h_change?: number }>;
    const assets = [
      ["BTC", "bitcoin"], ["ETH", "ethereum"], ["SOL", "solana"], ["USDC", "usd-coin"]
    ] as const;
    const rows = assets.flatMap(([symbol, id]) => {
      const quote = data[id];
      if (typeof quote?.usd !== "number" || !Number.isFinite(quote.usd) || typeof quote.usd_24h_change !== "number" || !Number.isFinite(quote.usd_24h_change)) return [];
      const price = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: quote.usd >= 100 ? 2 : quote.usd >= 1 ? 4 : 6 }).format(quote.usd);
      const change = (quote.usd_24h_change > 0 ? "+" : "") + quote.usd_24h_change.toFixed(2) + "%";
      return [`${symbol}: ${price} (${change} over 24h)`];
    });
    return rows.length ? "Live market snapshot from CoinGecko (retrieved just now; 24-hour change): " + rows.join("; ") + ". Prices move quickly; verify before trading." : null;
  } catch {
    return null;
  }
}

function localFallback(message: string): AssistantOutput {
  const text = message.trim();
  const isTransfer = /\b(send|pay|transfer)\b/i.test(text);
  if (isTransfer) {
    const amountMatch = text.match(/(?:\$\s*)?((?:\d+(?:\.\d+)?|\.\d+))\s*(usdc|usdt|eth|sol|btc|usd)?/i);
    const recipientMatch = text.match(/\b(?:to|for)\s+(0x[a-fA-F0-9]{40}|[a-z][a-z0-9_.-]*)/i);
    const amount = amountMatch?.[1]?.startsWith(".") ? "0" + amountMatch[1] : amountMatch?.[1] ?? null;
    const asset = (amountMatch?.[2] || "USDC").toUpperCase();
    const recipient = recipientMatch?.[1] ?? null;
    const validAmount = amount !== null && Number.isFinite(Number(amount)) && Number(amount) > 0;
    const validAsset = ASSETS.has(asset);
    const reply = validAmount && validAsset && recipient
      ? "I’ve prepared a transfer draft. The recipient is not verified, and no transaction has been sent. Confirm the exact address and network before continuing."
      : "I can help prepare a transfer, but I need a positive amount, a supported asset, and a recipient. Try: “Send 25 USDC to 0x…”. Names are not resolved in fallback mode.";
    return {
      reply,
      intent: {
        action: "transfer",
        amount: validAmount ? amount : null,
        asset: validAsset ? asset : null,
        recipient,
        chain: null,
        purpose: text.match(/\bfor\s+(.+)$/i)?.[1]?.slice(0, 160) ?? null,
        needsClarification: !(validAmount && validAsset && recipient),
        clarificationQuestion: validAmount && validAsset && recipient ? null : "What amount, asset, and recipient should I use?"
      }
    };
  }
  if (/\b(swap|exchange|trade)\b/i.test(text)) return { reply: "I can help plan a swap, but Sonus has not verified a supported Arc/Circle first-party same-chain swap API yet. Live quotes and execution remain disabled; I will not silently route through a third party or ask for your private key. Which assets and network are you considering?", intent: { action: "swap", amount: null, asset: null, recipient: null, chain: null, purpose: null, needsClarification: true, clarificationQuestion: "Which assets and network?" } };
  if (/\b(bridge|cross.chain)\b/i.test(text)) return { reply: "I can explain bridge options, but Sonus does not have live bridge quotes or execution connected yet. Tell me the source network, destination network, and asset.", intent: { action: "bridge", amount: null, asset: null, recipient: null, chain: null, purpose: null, needsClarification: true, clarificationQuestion: "What are the source and destination networks?" } };
  if (/\b(portfolio|balance|holdings)\b/i.test(text)) return { reply: "I can read native USDC on Arc Testnet when your wallet is connected. The portfolio dashboard and other asset balances are still illustrative, so I won’t invent a total or live valuation.", intent: { action: "portfolio", amount: null, asset: null, recipient: null, chain: null, purpose: null, needsClarification: false, clarificationQuestion: null } };
  if (/\b(market|price|trend|bitcoin|ethereum|solana)\b/i.test(text)) return { reply: "I’m checking the live market-data provider now. If it responds, I’ll share a timestamped spot-price snapshot; if not, I’ll say the current prices could not be verified.", intent: { action: "market", amount: null, asset: null, recipient: null, chain: null, purpose: null, needsClarification: false, clarificationQuestion: null } };
  if (/\b(safe|risk|scam|address|wallet)\b/i.test(text)) return { reply: "Before sending, verify the destination through a trusted channel, confirm the network and asset, review the fee, and inspect the wallet’s final transaction details. Never share your recovery phrase. An address format alone does not prove identity.", intent: { action: "risk", amount: null, asset: null, recipient: null, chain: null, purpose: null, needsClarification: false, clarificationQuestion: null } };
  return { reply: "I can help plan transfers, swaps, bridges, wallet-safety checks, and crypto concepts. Live market data and most execution routes are not connected yet. What are you trying to accomplish?", intent: { action: "unknown", amount: null, asset: null, recipient: null, chain: null, purpose: null, needsClarification: true, clarificationQuestion: "What are you trying to accomplish?" } };
}

function bindIntentToUserText(output: AssistantOutput, userText: string): AssistantOutput {
  if (output.intent.action !== "transfer") return output;
  const context = userText.toLowerCase();
  if (!/\b(send|pay|transfer)\b/i.test(userText)) {
    return { ...output, intent: { ...output.intent, action: "unknown", amount: null, asset: null, recipient: null, needsClarification: true, clarificationQuestion: "Are you asking to prepare a transfer, or just discussing one?" } };
  }

  const intent = { ...output.intent };
  if (intent.recipient && !context.includes(intent.recipient.toLowerCase())) {
    intent.recipient = null;
    intent.needsClarification = true;
    intent.clarificationQuestion = "Please provide the exact recipient address or name you want to use.";
  }
  if (intent.amount) {
    const numbers = userText.match(/(?:\$\s*)?\d+(?:\.\d+)?|\.\d+/g) ?? [];
    if (!numbers.some(token => Number(token.replace(/^\$\s*/, "")) === Number(intent.amount))) {
      intent.amount = null;
      intent.needsClarification = true;
      intent.clarificationQuestion = "What exact amount should I prepare?";
    }
  }
  if (intent.asset && !new RegExp(`\\b${intent.asset}\\b`, "i").test(userText)) {
    intent.asset = null;
    intent.needsClarification = true;
    intent.clarificationQuestion = "Which asset should I use? Please specify the token.";
  }
  if (intent.chain && intent.chain !== "unknown" && !context.includes(intent.chain.toLowerCase())) {
    intent.chain = null;
    intent.needsClarification = true;
    intent.clarificationQuestion = "Which network should I use?";
  }
  return { ...output, intent };
}

function validateOutput(value: unknown): AssistantOutput {
  if (!value || typeof value !== "object") throw new Error("Assistant returned an invalid response.");
  const raw = value as Record<string, unknown>;
  const rawIntent = raw.intent && typeof raw.intent === "object" ? raw.intent as Record<string, unknown> : {};
  const action = ACTIONS.includes(rawIntent.action as (typeof ACTIONS)[number]) ? rawIntent.action as AssistantIntent["action"] : "unknown";
  const amountValue = typeof rawIntent.amount === "string" && /^\d{1,18}(?:\.\d{1,12})?$/.test(rawIntent.amount) && Number(rawIntent.amount) > 0 ? rawIntent.amount : null;
  const assetValue = typeof rawIntent.asset === "string" ? rawIntent.asset.toUpperCase() : null;
  const asset = assetValue && ASSETS.has(assetValue) ? assetValue : null;
  const recipient = typeof rawIntent.recipient === "string" && rawIntent.recipient.length <= 120 ? rawIntent.recipient.trim() || null : null;
  const chainValue = typeof rawIntent.chain === "string" ? rawIntent.chain : null;
  const chain = chainValue && CHAINS.has(chainValue) ? chainValue : null;
  const purpose = typeof rawIntent.purpose === "string" ? rawIntent.purpose.slice(0, 160) : null;
  const reply = typeof raw.reply === "string" ? raw.reply.trim().slice(0, 1800) : "";
  if (!reply) throw new Error("Assistant response was empty.");
  return {
    reply,
    intent: {
      action,
      amount: amountValue,
      asset,
      recipient,
      chain,
      purpose,
      needsClarification: rawIntent.needsClarification === true,
      clarificationQuestion: typeof rawIntent.clarificationQuestion === "string" ? rawIntent.clarificationQuestion.slice(0, 300) : null
    }
  };
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > 20_000) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  if (isRateLimited(request)) return NextResponse.json({ error: "Too many assistant requests. Wait a minute and try again." }, { status: 429 });
  let body: unknown;
  try {
    const rawBody = await request.text();
    if (rawBody.length > 20_000) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  const data = body as Record<string, unknown>;
  const message = typeof data.message === "string" ? data.message.trim() : "";
  if (!message) return NextResponse.json({ error: "Write a message first." }, { status: 400 });
  if (message.length > 2000) return NextResponse.json({ error: "Message is too long. Keep it under 2,000 characters." }, { status: 413 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const fallback = localFallback(message);
    if (fallback.intent.action === "market") {
      const marketSummary = await getLiveMarketSummary();
      if (marketSummary) fallback.reply = marketSummary;
      else fallback.reply += " Live market data could not be retrieved just now.";
    }
    return NextResponse.json({ ...fallback, mode: "fallback" });
  }

  const history = Array.isArray(data.history)
    ? data.history.slice(-8).flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>;
      if ((row.role !== "user" && row.role !== "assistant") || typeof row.content !== "string") return [];
      return [{ role: row.role, content: row.content.slice(0, 1500) }];
    })
    : [];

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      reply: { type: "string" },
      intent: {
        type: "object",
        additionalProperties: false,
        properties: {
          action: { type: "string", enum: [...ACTIONS] },
          amount: { type: ["string", "null"] },
          asset: { type: ["string", "null"] },
          recipient: { type: ["string", "null"] },
          chain: { type: ["string", "null"] },
          purpose: { type: ["string", "null"] },
          needsClarification: { type: "boolean" },
          clarificationQuestion: { type: ["string", "null"] }
        },
        required: ["action", "amount", "asset", "recipient", "chain", "purpose", "needsClarification", "clarificationQuestion"]
      }
    },
    required: ["reply", "intent"]
  };

  try {
    let baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    while (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);
    const endpoint = baseUrl.endsWith("/chat/completions") ? baseUrl : baseUrl + "/chat/completions";
    const instructions = [
      "You are Sonus, a careful crypto payment-intelligence assistant.",
      "Help the user clarify intent and plan safe actions. You cannot execute transactions or access a wallet.",
      "Never claim a payment was sent, a balance was checked, a price is current, a quote was obtained, or a transaction was simulated.",
      "Do not treat a name or handle as a resolved wallet address. Never infer a recipient address.",
      "A valid EVM address string does not verify ownership or destination correctness.",
      "For transfers, extract only details explicitly stated. If amount, asset, recipient, or network is missing or ambiguous, set needsClarification=true and ask a concise question.",
      "Only use action transfer when the user clearly requests sending, paying, or transferring. Never convert advice or hypotheticals into an execution request.",
      "Allowed assets: USDC, USDT, ETH, SOL, BTC. Allowed chain values: Arc Testnet, Ethereum, Arbitrum, Base, Solana, unknown. Use unknown when not explicitly clear.",
      "Sonus currently supports only native USDC transfers on Arc Testnet. Other assets and chains may be discussed or drafted but must never be represented as executable.",
      "Full portfolio balances, swaps, bridges, staking, and external identity resolution are not connected. Sonus is investigating an Arc/Circle first-party swap path, but a supported public same-chain swap API has not been verified; do not claim a provider is selected, a quote exists, or a route is available. Never silently use a third-party swap provider. For market requests, the server may append a live CoinGecko price snapshot only when the provider responds successfully.",
      "Do not ask for seed phrases, private keys, or wallet passwords. Keep answers clear and concise.",
      "Return only one valid JSON object matching this schema: " + JSON.stringify(schema)
    ].join("\n");
    const chatMessages = [
      { role: "system", content: instructions },
      ...history.map(item => ({ role: item.role, content: item.content })),
      { role: "user", content: message }
    ];
    const requestBody = (strictSchema: boolean) => ({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      messages: chatMessages,
      ...(strictSchema ? {
        response_format: {
          type: "json_schema",
          json_schema: { name: "sonus_assistant_response", strict: true, schema }
        }
      } : { response_format: { type: "json_object" } }),
      max_tokens: 900,
      temperature: 0.2
    });
    const makeRequest = (strictSchema: boolean) => fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "application/json" },
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify(requestBody(strictSchema))
    });
    let upstream = await makeRequest(true);
    if (!upstream.ok && [400, 404, 422].includes(upstream.status)) {
      const detail = await upstream.text();
      console.warn("Sonus provider rejected strict JSON schema; retrying JSON mode", upstream.status, detail.slice(0, 250));
      upstream = await makeRequest(false);
    }
    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error("Sonus assistant provider error", upstream.status, detail.slice(0, 500));
      const message = upstream.status === 401
        ? "AI provider key was rejected. Check OPENAI_API_KEY."
        : upstream.status === 404
          ? "AI endpoint was not found. Check OPENAI_BASE_URL; use the provider's OpenAI-compatible /v1 base URL."
          : "AI provider request failed. Check OPENAI_BASE_URL, OPENAI_MODEL, the server key, and provider availability.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
    const result = await upstream.json() as {
      choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> | null } }>;
      error?: { message?: string };
    };
    const rawContent = result.choices?.[0]?.message?.content;
    const outputText = typeof rawContent === "string"
      ? rawContent
      : Array.isArray(rawContent)
        ? rawContent.map(part => part.text || "").join(String.fromCharCode(10))
        : "";
    if (!outputText) throw new Error(result.error?.message || "No assistant content was returned.");
    const fence = String.fromCharCode(96).repeat(3);
    const jsonText = outputText.trim().replace(new RegExp("^" + fence + "(?:json)?\\s*", "i"), "").replace(new RegExp("\\s*" + fence + "$"), "");
    const parsed = bindIntentToUserText(validateOutput(JSON.parse(jsonText)), message);
    if (parsed.intent.action === "market") {
      const marketSummary = await getLiveMarketSummary();
      if (marketSummary) parsed.reply = marketSummary;
      else parsed.reply += " Live market data could not be retrieved just now, so I can't verify current prices.";
    }
    return NextResponse.json({ ...parsed, mode: "ai" });
  } catch (error) {
    console.error("Sonus assistant route error", error);
    return NextResponse.json({ error: "Sonus could not complete that request. Please try again." }, { status: 502 });
  }
}
