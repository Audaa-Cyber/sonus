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
  assert.match(migration, /status not in \('confirmed', 'failed'\) or \(block_number is not null and block_hash is not null\)/i);
});

test("receipt observations are append-only and scoped to the parent ledger owner", () => {
  assert.match(migration, /create table if not exists public\.transaction_ledger_events/i);
  assert.match(migration, /foreign key \(transaction_id, user_id\)[\s\S]*?references public\.transaction_ledger \(id, user_id\)/i);
  assert.match(migration, /alter table public\.transaction_ledger_events enable row level security/i);
  assert.match(migration, /revoke insert, update, delete, truncate on public\.transaction_ledger_events from authenticated/i);
  assert.match(migration, /revoke update, delete, truncate on public\.transaction_ledger_events from service_role/i);
  assert.match(migration, /grant select, insert on public\.transaction_ledger_events to service_role/i);
});

test("migration contains one complete ledger definition with well-formed hash checks", () => {
  assert.equal((migration.match(/create table if not exists public\.transaction_ledger \(/gi) || []).length, 1);
  assert.equal((migration.match(/create table if not exists public\.transaction_ledger_events \(/gi) || []).length, 1);
  assert.match(migration, /transaction_ledger_block_hash_format check \(block_hash is null or lower\(block_hash\) ~ '\^0x\[a-f0-9\]\{64\}\$'\)/i);
  assert.doesNotMatch(migration, /lower\(block_hash\) ~ '\^0x\[a-f0-9\]\{64\}\s*constraint/i);
  assert.doesNotMatch(migration, /^\),\s*$/m);
});

test("confirmed and failed event observations require receipt block metadata", () => {
  assert.match(migration, /transaction_ledger_events_terminal_receipt_required check \([\s\S]*?status not in \('confirmed', 'failed'\) or \(block_number is not null and block_hash is not null\)/i);
});
