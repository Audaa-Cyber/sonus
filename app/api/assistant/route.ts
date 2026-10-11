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
  if (/\b(swap|exchange|trade)\b/i.test(text)) return { reply: "I can help plan a swap, but live quotes, route simulation, and execution are not connected yet. Which asset do you want to spend, what do you want to receive, and on which network?", intent: { action: "swap", amount: null, asset: null, recipient: null, chain: null, purpose: null, needsClarification: true, clarificationQuestion: "Which assets and network?" } };
  if (/\b(bridge|cross.chain)\b/i.test(text)) return { reply: "I can explain bridge options, but Sonus does not have live bridge quotes or execution connected yet. Tell me the source network, destination network, and asset.", intent: { action: "bridge", amount: null, asset: null, recipient: null, chain: null, purpose: null, needsClarification: true, clarificationQuestion: "What are the source and destination networks?" } };
  if (/\b(portfolio|balance|holdings)\b/i.test(text)) return { reply: "I can read native USDC on Arc Testnet when your wallet is connected. The portfolio dashboard and other asset balances are still illustrative, so I won’t invent a total or live valuation.", intent: { action: "portfolio", amount: null, asset: null, recipient: null, chain: null, purpose: null, needsClarification: false, clarificationQuestion: null } };
  if (/\b(market|price|trend|bitcoin|ethereum|solana)\b/i.test(text)) return { reply: "Live market data is not connected yet, so I can explain market concepts but can’t provide a verified current price or claim a live trend. A market-data provider is needed for that.", intent: { action: "market", amount: null, asset: null, recipient: null, chain: null, purpose: null, needsClarification: false, clarificationQuestion: null } };
  if (/\b(safe|risk|scam|address|wallet)\b/i.test(text)) return { reply: "Before sending, verify the destination through a trusted channel, confirm the network and asset, review the fee, and inspect the wallet’s final transaction details. Never share your recovery phrase. An address format alone does not prove identity.", intent: { action: "risk", amount: null, asset: null, recipient: null, chain: null, purpose: null, needsClarification: false, clarificationQuestion: null } };
  return { reply: "I can help plan transfers, swaps, bridges, wallet-safety checks, and crypto concepts. Live market data and most execution routes are not connected yet. What are you trying to accomplish?", intent: { action: "unknown", amount: null, asset: null, recipient: null, chain: null, purpose: null, needsClarification: true, clarificationQuestion: "What are you trying to accomplish?" } };
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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  const data = body as Record<string, unknown>;
  const message = typeof data.message === "string" ? data.message.trim() : "";
  if (!message) return NextResponse.json({ error: "Write a message first." }, { status: 400 });
  if (message.length > 2000) return NextResponse.json({ error: "Message is too long. Keep it under 2,000 characters." }, { status: 413 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ ...localFallback(message), mode: "fallback" });

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
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        store: false,
        instructions: [
          "You are Sonus, a careful crypto payment-intelligence assistant.",
          "Help the user clarify intent and plan safe actions. You cannot execute transactions or access a wallet.",
          "Never claim a payment was sent, a balance was checked, a price is current, a quote was obtained, or a transaction was simulated.",
          "Do not treat a name or handle as a resolved wallet address. Never infer a recipient address.",
          "A valid EVM address string does not verify ownership or destination correctness.",
          "For transfers, extract only details explicitly stated. If amount, asset, recipient, or network is missing or ambiguous, set needsClarification=true and ask a concise question.",
          "Only use action transfer when the user clearly requests sending, paying, or transferring. Never convert advice or hypotheticals into an execution request.",
          "Allowed assets: USDC, USDT, ETH, SOL, BTC. Allowed chain values: Arc Testnet, Ethereum, Arbitrum, Base, Solana, unknown. Use unknown when not explicitly clear.",
          "Sonus currently supports only native USDC transfers on Arc Testnet. Other assets and chains may be discussed or drafted but must never be represented as executable.",
          "Live market prices, full portfolio balances, swap quotes, bridges, staking, and external wallet identity resolution are not connected unless the user explicitly supplies evidence in the conversation.",
          "Do not ask for seed phrases, private keys, or wallet passwords. Keep answers clear and concise."
        ].join("\n"),
        input: [
          ...history.map((item) => ({ role: item.role, content: item.content })),
          { role: "user", content: message }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "sonus_assistant_response",
            strict: true,
            schema
          }
        },
        max_output_tokens: 700
      })
    });
    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error("Sonus assistant provider error", upstream.status, detail.slice(0, 500));
      return NextResponse.json({ error: upstream.status === 401 ? "AI provider key was rejected. Check OPENAI_API_KEY." : "AI provider request failed. Check server logs and provider availability." }, { status: 502 });
    }
    const result = await upstream.json() as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
    const outputText = result.output?.flatMap(item => item.content ?? []).find(item => item.type === "output_text")?.text;
    if (!outputText) throw new Error("No structured output was returned.");
    const parsed = validateOutput(JSON.parse(outputText));
    return NextResponse.json({ ...parsed, mode: "ai" });
  } catch (error) {
    console.error("Sonus assistant route error", error);
    return NextResponse.json({ error: "Sonus could not complete that request. Please try again." }, { status: 502 });
  }
}
