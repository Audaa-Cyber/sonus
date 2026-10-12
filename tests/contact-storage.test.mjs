import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSavedContacts } from "../lib/contact-storage.mjs";

const valid = (overrides = {}) => ({
  id: "contact-1",
  name: "Alex",
  address: "0x1111111111111111111111111111111111111111",
  createdAt: 1_790_000_000_000,
  ...overrides
});

test("keeps valid contacts and returns an empty list for invalid containers", () => {
  assert.deepEqual(normalizeSavedContacts([valid()]), [valid()]);
  assert.deepEqual(normalizeSavedContacts(null), []);
  assert.deepEqual(normalizeSavedContacts({}), []);
});

test("rejects malformed records, zero addresses, and invalid timestamps", () => {
  const invalid = [
    null,
    [],
    valid({ id: "" }),
    valid({ name: "   " }),
    valid({ name: "x".repeat(81) }),
    valid({ address: "not-an-address" }),
    valid({ address: "0x0000000000000000000000000000000000000000" }),
    valid({ createdAt: -1 }),
    valid({ createdAt: 1.5 }),
    valid({ createdAt: Number.MAX_SAFE_INTEGER + 1 })
  ];
  assert.deepEqual(normalizeSavedContacts(invalid), []);
});

test("trims labels and removes duplicate IDs and wallet addresses case-insensitively", () => {
  const first = valid({ id: "  first ", name: "  Alex  " });
  const duplicateId = valid({ id: "first", address: "0x2222222222222222222222222222222222222222", name: "Sam" });
  const duplicateAddress = valid({ id: "third", address: "0x1111111111111111111111111111111111111111".toUpperCase().replace("0X", "0x"), name: "Alex duplicate" });
  assert.deepEqual(normalizeSavedContacts([first, duplicateId, duplicateAddress]), [{
    id: "first",
    name: "Alex",
    address: first.address,
    createdAt: first.createdAt
  }]);
});

test("caps the normalized contact list at 200 unique records", () => {
  const contacts = Array.from({ length: 205 }, (_, index) => valid({
    id: "contact-" + index,
    address: "0x" + index.toString(16).padStart(40, "0")
  }));
  assert.equal(normalizeSavedContacts(contacts).length, 200);
});
