import test from "node:test";
import assert from "node:assert/strict";
import { normalizeReceipt, parseHexQuantity, parseReceiptRequest } from "../lib/transaction-receipt.mjs";

const hash = "0x" + "a".repeat(64);
const blockHash = "0x" + "b".repeat(64);
const validReceipt = (overrides = {}) => ({
  transactionHash: hash,
  blockNumber: "0x10",
  blockHash,
  status: "0x1",
  ...overrides
});

test("accepts only a transaction hash and Arc Testnet chain ID", () => {
  assert.equal(parseReceiptRequest(JSON.stringify({ txHash: hash, chainId: 5042002 })).ok, true);
  assert.equal(parseReceiptRequest(JSON.stringify({ txHash: "0x1234", chainId: 5042002 })).status, 400);
  assert.equal(parseReceiptRequest(JSON.stringify({ txHash: hash, chainId: 1 })).status, 400);
  assert.equal(parseReceiptRequest("null").status, 400);
  assert.equal(parseReceiptRequest("x".repeat(2001)).status, 413);
});

test("parses safe JSON-RPC hex quantities without accepting malformed values", () => {
  assert.equal(parseHexQuantity("0x0"), 0);
  assert.equal(parseHexQuantity("0x10"), 16);
  assert.equal(parseHexQuantity("0x01"), null);
  assert.equal(parseHexQuantity("10"), null);
  assert.equal(parseHexQuantity("0x20000000000000"), null);
});

test("normalizes a successful receipt and counts confirmations", () => {
  const result = normalizeReceipt(validReceipt(), { hash: blockHash }, 20);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.receipt.status, "confirmed");
    assert.equal(result.receipt.confirmations, 5);
    assert.equal(result.receipt.canonical, "matched");
  }
});

test("labels reverted receipts as failed", () => {
  const result = normalizeReceipt(validReceipt({ status: "0x0" }), { hash: blockHash }, 16);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.receipt.status, "failed");
});

test("detects a receipt whose block hash no longer matches the canonical block", () => {
  const result = normalizeReceipt(validReceipt(), { hash: "0x" + "c".repeat(64) }, 20);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.receipt.status, "reorged");
    assert.equal(result.receipt.canonical, "mismatch");
    assert.equal(result.receipt.confirmations, 0);
  }
});

test("does not call an unverifiable receipt confirmed", () => {
  const result = normalizeReceipt(validReceipt(), null, 20);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.receipt.status, "pending");
    assert.equal(result.receipt.canonical, "unknown");
    assert.equal(result.receipt.confirmations, 0);
  }
});

test("rejects malformed receipts", () => {
  assert.equal(normalizeReceipt(null, { hash: blockHash }, 20).ok, false);
  assert.equal(normalizeReceipt(validReceipt({ status: "0x2" }), { hash: blockHash }, 20).ok, false);
});
