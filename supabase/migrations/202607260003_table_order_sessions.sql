create table if not exists public.table_order_sessions (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  table_id uuid not null references public.restaurant_tables(id) on delete cascade,
  status text not null default 'open',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

alter table public.orders add column if not exists table_session_id uuid references public.table_order_sessions(id) on delete set null;

create index if not exists table_order_sessions_active_idx on public.table_order_sessions(branch_id, table_id, status);
create index if not exists orders_table_session_idx on public.orders(table_session_id);
