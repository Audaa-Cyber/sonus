import test from "node:test";
import assert from "node:assert/strict";
import { isHypotheticalPaymentQuestion } from "../lib/payment-intent.mjs";

test("classifies payment questions as advisory rather than explicit intent", () => {
  for (const prompt of [
    "Should I send 25 USDC to Alex?",
    "Can I transfer money to this address?",
    "How do I pay someone safely?",
    "What if I send 10 ETH to the wrong wallet?",
    "Do you think I should pay this invoice?"
  ]) {
    assert.equal(isHypotheticalPaymentQuestion(prompt), true, prompt);
  }
});

test("does not classify explicit payment commands as hypotheticals", () => {
  for (const prompt of [
    "Send 25 USDC to Alex",
    "Please pay 10 USDC to 0x1111111111111111111111111111111111111111",
    "Transfer 2 ETH to my saved wallet",
    "Would you send 25 USDC to Alex?"
  ]) {
    assert.equal(isHypotheticalPaymentQuestion(prompt), false, prompt);
  }
});

test("does not classify unrelated questions as payment hypotheticals", () => {
  assert.equal(isHypotheticalPaymentQuestion("Should I check my wallet balance?"), false);
  assert.equal(isHypotheticalPaymentQuestion("How do I use Sonus?"), false);
});
