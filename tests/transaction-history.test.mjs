import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTransactionHistory } from "../lib/transaction-history.mjs";

const valid = (overrides = {}) => ({
  hash: "0x" + "a".repeat(64),
  from: "0x1111111111111111111111111111111111111111",
  to: "0x2222222222222222222222222222222222222222",
  amount: "12.340001",
  asset: "USDC",
  network: "Arc Testnet",
  status: "confirmed",
  detail: "Payment confirmed",
  createdAt: 1_790_000_000_000,
  updatedAt: 1_790_000_000_100,
  ...overrides
});

test("keeps valid transactions and normalizes non-array input to an empty list", () => {
  assert.equal(normalizeTransactionHistory([valid()]).length, 1);
  assert.deepEqual(normalizeTransactionHistory(null), []);
  assert.deepEqual(normalizeTransactionHistory({}), []);
});

test("rejects malformed addresses, hashes, amounts, assets, and statuses", () => {
  const invalidRecords = [
    valid({ hash: "bad-hash" }),
    valid({ from: "not-an-address" }),
    valid({ to: "0x0000000000000000000000000000000000000000" }),
    valid({ amount: "-1" }),
    valid({ amount: "1e6" }),
    valid({ amount: "1000000000.000001" }),
    valid({ asset: "UNTRUSTED" }),
    valid({ status: "unknown" })
  ];
  assert.deepEqual(normalizeTransactionHistory(invalidRecords), []);
});

test("rejects oversized optional text and malformed block numbers", () => {
  assert.equal(normalizeTransactionHistory([valid({ note: "x".repeat(1001) })]).length, 0);
  assert.equal(normalizeTransactionHistory([valid({ policySummary: "x".repeat(2001) })]).length, 0);
  assert.equal(normalizeTransactionHistory([valid({ detail: "x".repeat(501) })]).length, 0);
  assert.equal(normalizeTransactionHistory([valid({ blockNumber: "12abc" })]).length, 0);
});

test("rejects invalid timestamps and caps retained history at 100 records", () => {
  assert.equal(normalizeTransactionHistory([valid({ createdAt: -1 })]).length, 0);
  assert.equal(normalizeTransactionHistory([valid({ updatedAt: 1.5 })]).length, 0);
  assert.equal(normalizeTransactionHistory(Array.from({ length: 105 }, (_, i) => valid({ hash: "0x" + i.toString(16).padStart(64, "0") }))).length, 100);
});
