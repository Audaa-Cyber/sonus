const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const TRANSACTION_HASH = /^0x[a-fA-F0-9]{64}$/;
const ZERO_ADDRESS = /^0x0{40}$/i;
const AMOUNT = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,6})?$/;
const ASSETS = new Set(["USDC", "USDT", "ETH", "SOL", "BTC"]);
const STATUSES = new Set(["submitted", "confirmed", "failed", "pending"]);

function isFiniteTimestamp(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isTransactionRecord(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return false;
  if (typeof item.hash !== "string" || !TRANSACTION_HASH.test(item.hash)) return false;
  if (typeof item.from !== "string" || !EVM_ADDRESS.test(item.from) || ZERO_ADDRESS.test(item.from)) return false;
  if (typeof item.to !== "string" || !EVM_ADDRESS.test(item.to) || ZERO_ADDRESS.test(item.to)) return false;
  if (typeof item.amount !== "string" || !AMOUNT.test(item.amount) || Number(item.amount) <= 0 || Number(item.amount) > 1_000_000_000) return false;
  if (typeof item.asset !== "string" || !ASSETS.has(item.asset)) return false;
  if (typeof item.network !== "string" || !item.network.trim() || item.network.length > 60) return false;
  if (!STATUSES.has(item.status)) return false;
  if (typeof item.detail !== "string" || item.detail.length > 500) return false;
  if (item.note !== undefined && (typeof item.note !== "string" || item.note.length > 1_000)) return false;
  if (item.policySummary !== undefined && (typeof item.policySummary !== "string" || item.policySummary.length > 2_000)) return false;
  if (item.blockNumber !== undefined && (typeof item.blockNumber !== "string" || !/^\d{1,24}$/.test(item.blockNumber))) return false;
  return isFiniteTimestamp(item.createdAt) && isFiniteTimestamp(item.updatedAt);
}

/**
 * Sanitizes browser-persisted transaction history before it affects the UI
 * or local spending-policy calculations.
 */
export function normalizeTransactionHistory(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(isTransactionRecord).slice(0, 100);
}
