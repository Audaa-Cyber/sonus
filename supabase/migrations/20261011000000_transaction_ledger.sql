-- Sonus persistent transaction ledger foundation.
-- Apply this migration to a Supabase project with Supabase Auth enabled.
-- The browser may insert a submitted record and read its own rows only.
-- Receipt/status reconciliation must be performed by a trusted server using service_role.

create table if not exists public.transaction_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chain_id bigint not null,
  network text not null,
  tx_hash text not null,
  sender text not null,
  recipient text not null,
  asset text not null,
  amount numeric(38, 18) not null,
  status text not null default 'submitted',
  block_number bigint,
  block_hash text,
  confirmation_count integer not null default 0,
  detail text,
  submitted_at timestamptz not null default now(),
  reconciled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint transaction_ledger_chain_id_positive check (chain_id > 0),
  constraint transaction_ledger_network_nonempty check (length(trim(network)) between 1 and 80),
  constraint transaction_ledger_asset_nonempty check (length(trim(asset)) between 1 and 24),
  constraint transaction_ledger_hash_format check (lower(tx_hash) ~ '^0x[a-f0-9]{64}$'),
  constraint transaction_ledger_sender_format check (lower(sender) ~ '^0x[a-f0-9]{40}$'),
  constraint transaction_ledger_recipient_format check (lower(recipient) ~ '^0x[a-f0-9]{40}$'),
  constraint transaction_ledger_amount_positive check (amount > 0),
  constraint transaction_ledger_status_valid check (status in ('submitted', 'pending', 'confirmed', 'failed', 'reorged')),
  constraint transaction_ledger_block_number_valid check (block_number is null or block_number >= 0),
  constraint transaction_ledger_block_hash_format check (block_hash is null or lower(block_hash) ~ '^0x[a-f0-9]{64}
  constraint transaction_ledger_confirmations_valid check (confirmation_count >= 0),
  constraint transaction_ledger_reconciled_status check (
    status in ('submitted', 'pending') or reconciled_at is not null
  )
);

create unique index if not exists transaction_ledger_user_chain_hash_uidx
  on public.transaction_ledger (user_id, chain_id, lower(tx_hash));

create index if not exists transaction_ledger_user_submitted_idx
  on public.transaction_ledger (user_id, submitted_at desc);

create index if not exists transaction_ledger_status_submitted_idx
  on public.transaction_ledger (status, submitted_at)
  where status in ('submitted', 'pending', 'reorged');

create or replace function public.set_transaction_ledger_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists transaction_ledger_set_updated_at on public.transaction_ledger;
create trigger transaction_ledger_set_updated_at
before update on public.transaction_ledger
for each row execute function public.set_transaction_ledger_updated_at();

alter table public.transaction_ledger enable row level security;

drop policy if exists "Users can read their own transaction ledger" on public.transaction_ledger;
create policy "Users can read their own transaction ledger"
  on public.transaction_ledger
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can submit their own transaction records" on public.transaction_ledger;
create policy "Users can submit their own transaction records"
  on public.transaction_ledger
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'submitted'
    and reconciled_at is null
    and block_number is null
    and block_hash is null
    and confirmation_count = 0
  );

revoke all on public.transaction_ledger from anon;
revoke update, delete, truncate on public.transaction_ledger from authenticated;
grant select, insert on public.transaction_ledger to authenticated;
grant select, insert, update, delete on public.transaction_ledger to service_role;
),
  constraint transaction_ledger_terminal_receipt_required check (
    status not in ('confirmed', 'failed') or (block_number is not null and block_hash is not null)
  ),
  constraint transaction_ledger_confirmations_valid check (confirmation_count >= 0),
  constraint transaction_ledger_reconciled_status check (
    status in ('submitted', 'pending') or reconciled_at is not null
  )
);

create unique index if not exists transaction_ledger_user_chain_hash_uidx
  on public.transaction_ledger (user_id, chain_id, lower(tx_hash));

create index if not exists transaction_ledger_user_submitted_idx
  on public.transaction_ledger (user_id, submitted_at desc);

create index if not exists transaction_ledger_status_submitted_idx
  on public.transaction_ledger (status, submitted_at)
  where status in ('submitted', 'pending', 'reorged');

create or replace function public.set_transaction_ledger_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists transaction_ledger_set_updated_at on public.transaction_ledger;
create trigger transaction_ledger_set_updated_at
before update on public.transaction_ledger
for each row execute function public.set_transaction_ledger_updated_at();

alter table public.transaction_ledger enable row level security;

drop policy if exists "Users can read their own transaction ledger" on public.transaction_ledger;
create policy "Users can read their own transaction ledger"
  on public.transaction_ledger
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can submit their own transaction records" on public.transaction_ledger;
create policy "Users can submit their own transaction records"
  on public.transaction_ledger
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'submitted'
    and reconciled_at is null
    and block_number is null
    and block_hash is null
    and confirmation_count = 0
  );

revoke all on public.transaction_ledger from anon;
revoke update, delete, truncate on public.transaction_ledger from authenticated;
grant select, insert on public.transaction_ledger to authenticated;
grant select, insert, update, delete on public.transaction_ledger to service_role;
