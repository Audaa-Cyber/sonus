import test from "node:test";
import assert from "node:assert/strict";
import { readLimitedBody } from "../lib/read-limited-body.mjs";

test("reads a request body within the byte limit", async () => {
  const result = await readLimitedBody(new Request("https://example.test", {
    method: "POST",
    body: JSON.stringify({ message: "hello" })
  }), 100);
  assert.deepEqual(result, { ok: true, text: '{"message":"hello"}' });
});

test("rejects bodies that exceed the limit by UTF-8 bytes", async () => {
  const result = await readLimitedBody(new Request("https://example.test", {
    method: "POST",
    body: "é".repeat(6)
  }), 10);
  assert.deepEqual(result, { ok: false, status: 413, error: "Request is too large." });
});

test("rejects missing bodies and invalid byte limits", async () => {
  assert.equal((await readLimitedBody(new Request("https://example.test"), 10)).ok, false);
  await assert.rejects(() => readLimitedBody(new Request("https://example.test", {
    method: "POST", body: "x"
  }), 0), /positive safe integer/);
});

test("decodes multi-byte characters split across streamed chunks", async () => {
  const encoded = new TextEncoder().encode("A€B");
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoded.slice(0, 2));
      controller.enqueue(encoded.slice(2, 3));
      controller.enqueue(encoded.slice(3));
      controller.close();
    }
  });
  const request = new Request("https://example.test", { method: "POST", body: stream, duplex: "half" });
  const result = await readLimitedBody(request, 5);
  assert.deepEqual(result, { ok: true, text: "A€B" });
});
