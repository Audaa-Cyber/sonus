import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migrationUrl = new URL("../supabase/migrations/20261011000000_transaction_ledger.sql", import.meta.url);
const migration = await readFile(migrationUrl, "utf8");

test("ledger migration enables row-level security and scopes reads to the signed-in user", () => {
  assert.match(migration, /alter table public\.transaction_ledger enable row level security/i);
  assert.match(migration, /for select\s+to authenticated\s+using\s*\(\(select auth\.uid\(\)\) = user_id\)/i);
});

test("authenticated users can only insert submitted records belonging to themselves", () => {
  assert.match(migration, /for insert\s+to authenticated\s+with check\s*\([\s\S]*?\(select auth\.uid\(\)\) = user_id[\s\S]*?status = 'submitted'/i);
  assert.match(migration, /revoke update, delete, truncate on public\.transaction_ledger from authenticated/i);
  assert.doesNotMatch(migration, /create policy[\s\S]*?for update\s+to authenticated/i);
  assert.doesNotMatch(migration, /create policy[\s\S]*?for delete\s+to authenticated/i);
});

test("ledger enforces valid transaction fields and avoids duplicate hashes per user and chain", () => {
  assert.match(migration, /transaction_ledger_hash_format check/i);
  assert.match(migration, /transaction_ledger_amount_positive check \(amount > 0\)/i);
  assert.match(migration, /transaction_ledger_status_valid check/i);
  assert.match(migration, /unique index if not exists transaction_ledger_user_chain_hash_uidx[\s\S]*?user_id, chain_id, lower\(tx_hash\)/i);
});

test("reconciled states require a reconciliation timestamp and use an updated-at trigger", () => {
  assert.match(migration, /status in \('submitted', 'pending'\) or reconciled_at is not null/i);
  assert.match(migration, /create trigger transaction_ledger_set_updated_at/i);
});

test("terminal receipt states require a valid block hash and block number", () => {
  assert.match(migration, /transaction_ledger_block_hash_format check/i);
  assert.match(migration, /status not in \(\x27confirmed\x27, \x27failed\x27\) or \(block_number is not null and block_hash is not null\)/i);
});
