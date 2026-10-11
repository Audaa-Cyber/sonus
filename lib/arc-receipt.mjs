const HASH = /^0x[a-fA-F0-9]{64}$/;
const QUANTITY = /^0x(?:0|[1-9a-fA-F][0-9a-fA-F]*)$/;

export function isTransactionHash(value) {
  return typeof value === "string" && HASH.test(value);
}

function parseQuantity(value) {
  if (typeof value !== "string" || !QUANTITY.test(value)) return null;
  try {
    const parsed = BigInt(value);
    return parsed >= 0n ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Classifies a single RPC receipt snapshot. "confirmed" means mined with a
 * successful receipt, not irreversible finality.
 */
/**
 * @param {unknown} hash
 * @param {unknown} receipt
 * @param {unknown} latestBlock
 * @param {unknown} canonicalBlock
 */
export function classifyReceipt(hash, receipt, latestBlock, canonicalBlock) {
  if (!isTransactionHash(hash)) return { status: "unknown", hash };
  const head = parseQuantity(latestBlock);
  if (head === null) return { status: "unknown", hash };

  if (receipt === null) {
    return { status: "pending", hash, blockNumber: null, confirmations: 0 };
  }
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) {
    return { status: "unknown", hash };
  }

  const row = receipt;
  if (typeof row.transactionHash !== "string" ||
      row.transactionHash.toLowerCase() !== hash.toLowerCase() ||
      typeof row.blockNumber !== "string" ||
      (row.status !== "0x0" && row.status !== "0x1")) {
    return { status: "unknown", hash };
  }

  const block = parseQuantity(row.blockNumber);
  if (block === null || block > head) return { status: "unknown", hash };

  if (canonicalBlock !== undefined) {
    if (!canonicalBlock || typeof canonicalBlock !== "object" || Array.isArray(canonicalBlock)) {
      return { status: "unknown", hash, detail: "The receipt's canonical block could not be verified." };
    }
    const canonicalHash = canonicalBlock.hash;
    if (typeof row.blockHash !== "string" || !HASH.test(row.blockHash) ||
        typeof canonicalHash !== "string" || !HASH.test(canonicalHash)) {
      return { status: "unknown", hash, detail: "The RPC returned incomplete block-hash data." };
    }
    if (row.blockHash.toLowerCase() !== canonicalHash.toLowerCase()) {
      return {
        status: "reorged",
        hash,
        blockNumber: block.toString(),
        confirmations: 0,
        detail: "The receipt block hash no longer matches the canonical block at that height. Recheck before taking action."
      };
    }
  }

  const confirmations = Number(head - block + 1n);
  return {
    status: row.status === "0x1" ? "confirmed" : "failed",
    hash,
    blockNumber: block.toString(),
    confirmations: Number.isSafeInteger(confirmations) ? confirmations : Number.MAX_SAFE_INTEGER
  };
}
