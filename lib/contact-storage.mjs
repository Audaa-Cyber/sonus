const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const ZERO_ADDRESS = /^0x0{40}$/i;

function isSavedContact(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (typeof value.id !== "string" || !value.id.trim() || value.id.length > 100) return false;
  if (typeof value.name !== "string" || !value.name.trim() || value.name.trim().length > 80) return false;
  if (typeof value.address !== "string" || !EVM_ADDRESS.test(value.address) || ZERO_ADDRESS.test(value.address)) return false;
  if (typeof value.createdAt !== "number" || !Number.isSafeInteger(value.createdAt) || value.createdAt < 0) return false;
  return true;
}

/** Validates browser-persisted contacts before they enter workspace state. */
export function normalizeSavedContacts(value) {
  if (!Array.isArray(value)) return [];
  const seenIds = new Set();
  const seenAddresses = new Set();
  const contacts = [];
  for (const item of value) {
    if (!isSavedContact(item)) continue;
    const id = item.id.trim();
    const address = item.address.toLowerCase();
    if (seenIds.has(id) || seenAddresses.has(address)) continue;
    seenIds.add(id);
    seenAddresses.add(address);
    contacts.push({ id, name: item.name.trim(), address: item.address, createdAt: item.createdAt });
    if (contacts.length >= 200) break;
  }
  return contacts;
}
