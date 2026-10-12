import test from "node:test";
import assert from "node:assert/strict";
import { parseContactImport } from "../lib/contact-import.mjs";

test("imports valid JSON contacts and rejects invalid addresses", () => {
  const result = parseContactImport(JSON.stringify({
    contacts: [
      { name: "  Alex  Smith ", address: "0x1111111111111111111111111111111111111111" },
      { name: "Bad contact", address: "not-an-address" },
      { label: "Zero address", walletAddress: "0x0000000000000000000000000000000000000000" }
    ]
  }), "metamask-export.json");
  assert.deepEqual(result.contacts, [
    { name: "Alex Smith", address: "0x1111111111111111111111111111111111111111" }
  ]);
  assert.equal(result.rejected, 2);
});

test("imports CSV with quoted names and commas", () => {
  const result = parseContactImport(
    'name,address\n"Amy, Jr.",0x2222222222222222222222222222222222222222\n',
    "contacts.csv"
  );
  assert.deepEqual(result.contacts, [
    { name: "Amy, Jr.", address: "0x2222222222222222222222222222222222222222" }
  ]);
  assert.equal(result.rejected, 0);
});

test("rejects files without the required columns", () => {
  assert.throws(() => parseContactImport("nickname,chain\nAlex,ethereum", "contacts.csv"), /name and address columns/);
});

test("rejects oversized imports", () => {
  assert.throws(() => parseContactImport("x".repeat(2_000_001), "contacts.json"), /under 2 MB/);
});
