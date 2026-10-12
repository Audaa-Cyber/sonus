const ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const ZERO_ADDRESS = /^0x0{40}$/i;
const AMOUNT = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,6})?$/;
const MAX_AMOUNT = 1_000_000_000;
const ARC_TESTNET_CHAIN_ID = 5042002;
const requiredFields = ["sender", "recipient", "amount", "asset", "network", "chainId"];

/**
 * @param {string} raw
 * @returns {{ok: true, body: Record<string, unknown>} | {ok: false, status: number, error: string}}
 */
export function parseRiskPayload(raw) {
  if (new TextEncoder().encode(raw).byteLength > 8_000) return { ok: false, status: 413, error: "Request too large." };
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch { return { ok: false, status: 400, error: "Expected a JSON request." }; }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, status: 400, error: "Expected a JSON object." };
  }
  for (const field of requiredFields) {
    if (typeof parsed[field] !== (field === "chainId" ? "number" : "string")) {
      return { ok: false, status: 400, error: "sender, recipient, amount, asset, network, and chainId are required." };
    }
  }
  if (!Number.isSafeInteger(parsed.chainId) || parsed.chainId <= 0) {
    return { ok: false, status: 400, error: "chainId must be a positive safe integer." };
  }
  return { ok: true, body: parsed };
}

/** @param {Record<string, unknown>} body */
export function evaluateRiskPayload(body) {
  const checks = [];
  if (typeof body.sender !== "string" || !ADDRESS.test(body.sender)) checks.push({ code: "invalid_sender", severity: "block", message: "The connected sender address is malformed." });
  if (typeof body.sender === "string" && ADDRESS.test(body.sender) && ZERO_ADDRESS.test(body.sender)) checks.push({ code: "zero_sender", severity: "block", message: "The zero address cannot be a normal sending wallet." });
  if (typeof body.recipient !== "string" || !ADDRESS.test(body.recipient)) checks.push({ code: "invalid_recipient", severity: "block", message: "The recipient is not a valid 20-byte EVM address." });
  if (typeof body.recipient === "string" && ADDRESS.test(body.recipient) && ZERO_ADDRESS.test(body.recipient)) checks.push({ code: "zero_address", severity: "block", message: "The zero address cannot receive a normal wallet payment." });
  if (typeof body.sender === "string" && typeof body.recipient === "string" && ADDRESS.test(body.sender) && ADDRESS.test(body.recipient) && body.sender.toLowerCase() === body.recipient.toLowerCase()) {
    checks.push({ code: "self_transfer", severity: "block", message: "The recipient is the same as the sending wallet." });
  }
  if (typeof body.amount !== "string" || !AMOUNT.test(body.amount) || !Number.isFinite(Number(body.amount)) || Number(body.amount) <= 0 || Number(body.amount) > MAX_AMOUNT) {
    checks.push({ code: "invalid_amount", severity: "block", message: "Enter a positive amount up to 1,000,000,000 USDC with at most 6 decimal places." });
  }
  if (body.asset !== "USDC" || body.network !== "Arc Testnet" || body.chainId !== ARC_TESTNET_CHAIN_ID) {
    checks.push({ code: "unsupported_route", severity: "block", message: "This preflight only supports native USDC transfers on Arc Testnet (chain ID 5042002)." });
  }
  if (body.chainId === ARC_TESTNET_CHAIN_ID) checks.push({ code: "testnet_asset", severity: "warning", message: "Arc Testnet balances are test assets, not real funds." });
  if (typeof body.recipient === "string" && ADDRESS.test(body.recipient) && !ZERO_ADDRESS.test(body.recipient)) {
    checks.push({ code: "identity_unverified", severity: "warning", message: "Address format does not verify the recipient's real-world identity or ownership." });
  }
  const blocked = checks.some(check => check.severity === "block");
  return {
    status: blocked ? "blocked" : checks.some(check => check.severity === "warning") ? "review" : "clear",
    allowedToContinue: !blocked,
    scope: "deterministic_preflight_only",
    securityProviderConnected: false,
    checks,
    disclaimer: "This checks basic transaction parameters only. It does not scan phishing lists, token contracts, malicious activity, or simulate execution, and it cannot guarantee a transaction is safe."
  };
}
