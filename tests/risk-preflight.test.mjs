import test from "node:test";
import assert from "node:assert/strict";
import { evaluateRiskPayload, parseRiskPayload } from "../lib/risk-preflight.mjs";

const sender = "0x1111111111111111111111111111111111111111";
const recipient = "0x2222222222222222222222222222222222222222";
const valid = () => ({ sender, recipient, amount: "12.34", asset: "USDC", network: "Arc Testnet", chainId: 5042002 });

test("accepts a valid request envelope", () => {
  const result = parseRiskPayload(JSON.stringify(valid()));
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.body.amount, "12.34");
});

test("rejects malformed JSON, null, arrays, missing fields, and oversized payloads", () => {
  assert.equal(parseRiskPayload("{").status, 400);
  assert.equal(parseRiskPayload("null").status, 400);
  assert.equal(parseRiskPayload("[]").status, 400);
  assert.equal(parseRiskPayload("{}").status, 400);
  assert.equal(parseRiskPayload(" ".repeat(8001)).status, 413);
  assert.equal(parseRiskPayload("é".repeat(4001)).status, 413, "limit is measured in UTF-8 bytes");
});

test("allows a valid Arc Testnet transfer only with explicit review warnings", () => {
  const result = evaluateRiskPayload(valid());
  assert.equal(result.allowedToContinue, true);
  assert.equal(result.status, "review");
  assert.ok(result.checks.some(check => check.code === "testnet_asset"));
  assert.ok(result.checks.some(check => check.code === "identity_unverified"));
  assert.equal(result.securityProviderConnected, false);
});

test("blocks the zero address and self-transfers", () => {
  const zero = evaluateRiskPayload({ ...valid(), recipient: "0x0000000000000000000000000000000000000000" });
  assert.equal(zero.allowedToContinue, false);
  assert.ok(zero.checks.some(check => check.code === "zero_address"));
  const self = evaluateRiskPayload({ ...valid(), recipient: sender });
  assert.equal(self.allowedToContinue, false);
  assert.ok(self.checks.some(check => check.code === "self_transfer"));
});

test("blocks malformed addresses and invalid amounts", () => {
  for (const amount of ["0", "-1", "1.1234567", "1e4", "01", "1000000000.000001", "1000000001", "99999999999999999"]) {
    const result = evaluateRiskPayload({ ...valid(), amount });
    assert.equal(result.allowedToContinue, false, "invalid amount should be blocked: " + amount);
    assert.ok(result.checks.some(check => check.code === "invalid_amount"));
  }
  const maximum = evaluateRiskPayload({ ...valid(), amount: "1000000000" });
  assert.equal(maximum.allowedToContinue, true, "the configured maximum is inclusive");
  const zeroSender = evaluateRiskPayload({ ...valid(), sender: "0x0000000000000000000000000000000000000000" });
  assert.equal(zeroSender.allowedToContinue, false);
  assert.ok(zeroSender.checks.some(check => check.code === "zero_sender"));
  const address = evaluateRiskPayload({ ...valid(), recipient: "not-an-address" });
  assert.equal(address.allowedToContinue, false);
  assert.ok(address.checks.some(check => check.code === "invalid_recipient"));
});

test("blocks unsupported assets, networks, and chain IDs", () => {
  for (const patch of [{ asset: "ETH" }, { network: "Ethereum" }, { chainId: 1 }]) {
    const result = evaluateRiskPayload({ ...valid(), ...patch });
    assert.equal(result.allowedToContinue, false);
    assert.ok(result.checks.some(check => check.code === "unsupported_route"));
  }
});
