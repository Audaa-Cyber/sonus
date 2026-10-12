/**
 * Reads a request stream without buffering more than the configured byte limit.
 * The limit is measured on the incoming UTF-8 bytes, not JavaScript string units.
 */
export async function readLimitedBody(request, maxBytes) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new TypeError("maxBytes must be a positive safe integer.");
  }
  if (!request?.body) return { ok: false, status: 400, error: "Request body is missing." };
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let bytesRead = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      bytesRead += value.byteLength;
      if (bytesRead > maxBytes) {
        await reader.cancel("Request body exceeds the allowed size.");
        return { ok: false, status: 413, error: "Request is too large." };
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return { ok: true, text };
  } catch {
    return { ok: false, status: 400, error: "Could not read request body." };
  } finally {
    reader.releaseLock();
  }
}
