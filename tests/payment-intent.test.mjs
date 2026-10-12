import test from "node:test";
import assert from "node:assert/strict";
import { isNonActionablePaymentText } from "../lib/payment-intent.mjs";

test("classifies advisory, hypothetical, and negative language as non-actionable", () => {
  for (const prompt of [
    "Should I send 25 USDC to Alex?",
    "Can I transfer money to this address?",
    "How do I pay someone safely?",
    "What if I send 10 ETH to the wrong wallet?",
    "Do you think I should pay this invoice?",
    "I do not want to send 25 USDC to Alex",
    "Do not transfer funds to that address",
    "I will not pay this invoice",
    "I don't think I should send 25 USDC to Alex",
    "I am not sure whether I should transfer funds",
    "Is it a good idea to pay this invoice?",
    "Do you want me to send 25 USDC to Alex?",
    "Would you like me to transfer funds?",
    "I wonder if I should pay this invoice"
  ]) {
    assert.equal(isNonActionablePaymentText(prompt), true, prompt);
  }
});

test("does not classify explicit payment commands as hypotheticals", () => {
  for (const prompt of [
    "Send 25 USDC to Alex",
    "Please pay 10 USDC to 0x1111111111111111111111111111111111111111",
    "Transfer 2 ETH to my saved wallet",
    "Would you send 25 USDC to Alex?",
    "Send 25 USDC to Alex, don't forget to add a note"
  ]) {
    assert.equal(isNonActionablePaymentText(prompt), false, prompt);
  }
});

test("does not classify unrelated questions as non-actionable payment text", () => {
  assert.equal(isNonActionablePaymentText("Should I check my wallet balance?"), false);
  assert.equal(isNonActionablePaymentText("How do I use Sonus?"), false);
});
