const TX_HASH = /^0x[a-fA-F0-9]{64}$/;
const HEX_QUANTITY = /^0x(?:0|[1-9a-fA-F][0-9a-fA-F]*)$/;

export function parseReceiptRequest(raw) {
  if (new TextEncoder().encode(raw).byteLength > 2_000) {
    return { ok: false, status: 413, error: "Request too large." };
  }
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return { ok: false, status: 400, error: "Expected a JSON request." };
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, status: 400, error: "Expected a JSON object." };
  }
  if (typeof body.txHash !== "string" || !TX_HASH.test(body.txHash)) {
    return { ok: false, status: 400, error: "A valid 32-byte transaction hash is required." };
  }
  if (body.chainId !== 5042002) {
    return { ok: false, status: 400, error: "Only Arc Testnet (chain ID 5042002) is supported." };
  }
  return { ok: true, body: { txHash: body.txHash } };
}

export function parseHexQuantity(value) {
  if (typeof value !== "string" || !HEX_QUANTITY.test(value)) return null;
  const parsed = Number(BigInt(value));
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function normalizeReceipt(receipt, canonicalBlock, headBlock) {
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) {
    return { ok: false, error: "RPC returned an invalid transaction receipt." };
  }
  const blockNumber = parseHexQuantity(receipt.blockNumber);
  const status = receipt.status;
  const txHash = receipt.transactionHash;
  const blockHash = receipt.blockHash;
  if (blockNumber === null || !TX_HASH.test(txHash ?? "") || !TX_HASH.test(blockHash ?? "") ||
      (status !== "0x0" && status !== "0x1")) {
    return { ok: false, error: "RPC returned an incomplete transaction receipt." };
  }

  if (!canonicalBlock || typeof canonicalBlock.hash !== "string" || !TX_HASH.test(canonicalBlock.hash)) {
    return {
      ok: true,
      receipt: {
        txHash,
        status: "pending",
        blockNumber,
        blockHash,
        confirmations: 0,
        canonical: "unknown",
        detail: "A receipt was found, but the canonical block could not be verified. Check again shortly."
      }
    };
  }

  if (canonicalBlock.hash.toLowerCase() !== blockHash.toLowerCase()) {
    return {
      ok: true,
      receipt: {
        txHash,
        status: "reorged",
        blockNumber,
        blockHash,
        confirmations: 0,
        canonical: "mismatch",
        detail: "The receipt block hash no longer matches the canonical block at that height. Recheck before taking action."
      }
    };
  }

  const confirmations = typeof headBlock === "number" && Number.isSafeInteger(headBlock) && headBlock >= blockNumber
    ? headBlock - blockNumber + 1
    : 1;
  return {
    ok: true,
    receipt: {
      txHash,
      status: status === "0x1" ? "confirmed" : "failed",
      blockNumber,
      blockHash,
      confirmations,
      canonical: "matched",
      detail: status === "0x1"
        ? "The RPC reports a successful receipt in the canonical block currently returned by this provider. This is not a guarantee of irreversible finality."
        : "The RPC reports that the transaction reverted. The transaction may still have consumed network fees."
    }
  };
}
