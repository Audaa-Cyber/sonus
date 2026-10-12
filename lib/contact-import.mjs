const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function cleanName(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, 50) : "";
}

function cleanAddress(value) {
  return typeof value === "string" ? value.trim() : "";
}

function splitCsvLine(line) {
  const cells = [];
  let cell = "";
  let quoted = false;
  let closedQuote = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
        closedQuote = true;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === ",") {
      cells.push(cell.trim());
      cell = "";
      closedQuote = false;
    } else if (char === '"' && cell.trim() === "" && !closedQuote) {
      cell = "";
      quoted = true;
    } else if (closedQuote && !/\\s/.test(char)) {
      throw new Error("CSV contains characters after a closing quote.");
    } else if (char === '"') {
      throw new Error("CSV contains a quote inside an unquoted field.");
    } else if (!closedQuote) {
      cell += char;
    }
  }
  if (quoted) throw new Error("CSV contains an unfinished quoted field.");
  cells.push(cell.trim());
  return cells;
}

function normalizeRecords(records) {
  if (!Array.isArray(records)) throw new Error("Expected a JSON array of contacts.");
  const contacts = [];
  let rejected = 0;
  for (const item of records) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      rejected += 1;
      continue;
    }
    const record = item;
    const name = cleanName(record.name ?? record.label ?? record.contactName ?? record.nickname);
    const address = cleanAddress(record.address ?? record.walletAddress ?? record.wallet_address ?? record.account ?? record.publicAddress);
    if (!name || !ADDRESS_RE.test(address) || /^0x0{40}$/i.test(address)) {
      rejected += 1;
      continue;
    }
    contacts.push({ name, address });
  }
  return { contacts, rejected };
}

export function parseContactImport(text, filename = "contacts.json") {
  if (typeof text !== "string" || !text.trim()) throw new Error("The selected file is empty.");
  if (new TextEncoder().encode(text).byteLength > 2_000_000) throw new Error("Contact import is too large. Choose a file under 2 MB.");
  const normalizedText = text.replace(/^\uFEFF/, "");
  const extension = filename.toLowerCase().split(".").pop();

  if (extension === "json" || normalizedText.trimStart().startsWith("[") || normalizedText.trimStart().startsWith("{")) {
    let parsed;
    try {
      parsed = JSON.parse(normalizedText);
    } catch {
      throw new Error("This file is not valid JSON.");
    }
    const records = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object"
        ? [parsed.contacts, parsed.addressBook, parsed.data, parsed.accounts].find(Array.isArray)
        : null;
    if (!records) throw new Error("JSON must contain a contact array such as contacts, addressBook, data, or accounts.");
    return normalizeRecords(records);
  }

  if (extension !== "csv") throw new Error("Choose a .csv or .json contacts file.");
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) throw new Error("CSV needs a header row and at least one contact.");
  const headers = splitCsvLine(lines[0]).map(header => header.toLowerCase().replace(/[\s_-]/g, ""));
  const nameIndex = headers.findIndex(header => ["name", "label", "contactname", "nickname"].includes(header));
  const addressIndex = headers.findIndex(header => ["address", "walletaddress", "account", "publicaddress"].includes(header));
  if (nameIndex < 0 || addressIndex < 0) throw new Error("CSV needs name and address columns.");
  const records = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    records.push({ name: cells[nameIndex] ?? "", address: cells[addressIndex] ?? "" });
  }
  return normalizeRecords(records);
}
