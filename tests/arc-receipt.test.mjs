import test from "node:test";
import assert from "node:assert/strict";
import { classifyReceipt, isTransactionHash } from "../lib/arc-receipt.mjs";

const hash = "0x" + "a".repeat(64);
const receipt = (patch = {}) => ({
  transactionHash: hash,
  blockNumber: "0x64",
  status: "0x1",
  ...patch
});

test("validates 32-byte transaction hashes", () => {
  assert.equal(isTransactionHash(hash), true);
  assert.equal(isTransactionHash("0x1234"), false);
  assert.equal(isTransactionHash("not-a-hash"), false);
  assert.equal(isTransactionHash(null), false);
});

test("reports a missing receipt as pending", () => {
  assert.deepEqual(classifyReceipt(hash, null, "0x65"), {
    status: "pending", hash, blockNumber: null, confirmations: 0
  });
});

test("reports a successful mined receipt and computes confirmations", () => {
  assert.deepEqual(classifyReceipt(hash, receipt(), "0x65"), {
    status: "confirmed", hash, blockNumber: "100", confirmations: 2
  });
});

test("reports a reverted receipt as failed", () => {
  assert.equal(classifyReceipt(hash, receipt({ status: "0x0" }), "0x65").status, "failed");
});

test("does not trust malformed or mismatched receipt data", () => {
  assert.equal(classifyReceipt(hash, {}, "0x65").status, "unknown");
  assert.equal(classifyReceipt(hash, receipt({ transactionHash: "0x" + "b".repeat(64) }), "0x65").status, "unknown");
  assert.equal(classifyReceipt(hash, receipt({ blockNumber: "0x66" }), "0x65").status, "unknown");
  assert.equal(classifyReceipt(hash, receipt({ status: "0x2" }), "0x65").status, "unknown");
  assert.equal(classifyReceipt(hash, receipt(), "latest").status, "unknown");
  assert.equal(classifyReceipt("bad-hash", null, "0x65").status, "unknown");
});
