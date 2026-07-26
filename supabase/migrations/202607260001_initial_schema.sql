-- Food Pavilion modular restaurant platform schema
-- PostgreSQL / Supabase compatible

create extension if not exists "pgcrypto";

create type public.app_role as enum ('reception', 'manager', 'admin');
create type public.entry_kind as enum ('sale', 'cost');
create type public.payment_method as enum ('cash', 'card', 'mobile_banking', 'other');
create type public.order_status as enum ('draft', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled');
create type public.table_status as enum ('available', 'occupied', 'reserved', 'inactive');
create type public.stock_movement_type as enum ('purchase', 'usage', 'waste', 'adjustment', 'transfer_in', 'transfer_out');

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  name text not null,
  code text not null,
  address text,
  phone text,
  timezone text not null default 'Asia/Dhaka',
  currency_code char(3) not null default 'BDT',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organisation_id, code)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  default_branch_id uuid references public.branches(id) on delete set null,
  full_name text not null,
  email text not null,
  role public.app_role not null default 'reception',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  permission_key text not null unique,
  label text not null,
  module_key text not null,
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  role public.app_role not null,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  allowed boolean not null default false,
  primary key (organisation_id, role, permission_id)
);

create table public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  entry_kind public.entry_kind not null,
  amount numeric(14,2) not null check (amount > 0),
  payment_method public.payment_method,
  cost_category text,
  note text,
  description text,
  occurred_at timestamptz not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edit_count integer not null default 0 check (edit_count >= 0),
  archived_at timestamptz,
  check (
    (entry_kind = 'sale' and payment_method is not null)
    or (entry_kind = 'cost' and cost_category is not null)
  )
);

create index financial_entries_branch_date_idx on public.financial_entries(branch_id, occurred_at desc);
create index financial_entries_kind_date_idx on public.financial_entries(entry_kind, occurred_at desc);

create table public.entry_attachments (
  id uuid primary key default gen_random_uuid(),
  financial_entry_id uuid not null references public.financial_entries(id) on delete cascade,
  storage_path text not null,
  original_filename text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.financial_entry_audits (
  id uuid primary key default gen_random_uuid(),
  financial_entry_id uuid not null references public.financial_entries(id) on delete restrict,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  original_data jsonb not null,
  updated_data jsonb not null,
  edit_reason text not null check (char_length(trim(edit_reason)) > 0),
  edited_by uuid not null references public.profiles(id) on delete restrict,
  edited_at timestamptz not null default now(),
  edit_number integer not null check (edit_number > 0)
);

create index financial_entry_audits_entry_idx on public.financial_entry_audits(financial_entry_id, edited_at desc);

-- Future menu management
create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  category_id uuid references public.menu_categories(id) on delete set null,
  name text not null,
  sku text,
  description text,
  sale_price numeric(14,2) not null default 0,
  food_cost numeric(14,2) not null default 0,
  tax_rate numeric(6,3) not null default 0,
  image_path text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (branch_id, sku)
);

-- Future table and customer management
create table public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  table_number text not null,
  capacity integer not null default 2,
  area_name text,
  status public.table_status not null default 'available',
  active boolean not null default true,
  unique (branch_id, table_number)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  full_name text,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  employee_code text not null,
  full_name text not null,
  job_title text,
  phone text,
  hired_on date,
  active boolean not null default true,
  unique (organisation_id, employee_code)
);

-- Future order and kitchen management
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  order_number bigint generated always as identity,
  table_id uuid references public.restaurant_tables(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  waitstaff_id uuid references public.employees(id) on delete set null,
  status public.order_status not null default 'draft',
  order_type text not null default 'dine_in',
  subtotal numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  service_charge numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  notes text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict
);

create index orders_branch_status_idx on public.orders(branch_id, status, opened_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  item_name_snapshot text not null,
  quantity numeric(10,3) not null check (quantity > 0),
  unit_price numeric(14,2) not null,
  line_discount numeric(14,2) not null default 0,
  line_total numeric(14,2) not null,
  kitchen_note text,
  created_at timestamptz not null default now()
);

create table public.kitchen_order_tokens (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  token_number bigint generated always as identity,
  status text not null default 'queued',
  printed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Future discount and payment management
create table public.discounts (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  name text not null,
  discount_type text not null check (discount_type in ('fixed', 'percentage')),
  value numeric(14,3) not null,
  valid_from timestamptz,
  valid_until timestamptz,
  active boolean not null default true
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,
  order_id uuid references public.orders(id) on delete set null,
  financial_entry_id uuid references public.financial_entries(id) on delete set null,
  payment_method public.payment_method not null,
  amount numeric(14,2) not null check (amount > 0),
  transaction_reference text,
  paid_at timestamptz not null default now(),
  received_by uuid not null references public.profiles(id) on delete restrict
);

-- Future inventory management
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  name text not null,
  sku text,
  unit text not null,
  minimum_stock numeric(14,3) not null default 0,
  active boolean not null default true,
  unique (organisation_id, sku)
);

create table public.branch_inventory (
  branch_id uuid not null references public.branches(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  quantity_on_hand numeric(14,3) not null default 0,
  average_unit_cost numeric(14,4) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (branch_id, inventory_item_id)
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  movement_type public.stock_movement_type not null,
  quantity numeric(14,3) not null,
  unit_cost numeric(14,4),
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index stock_movements_branch_item_idx on public.stock_movements(branch_id, inventory_item_id, created_at desc);

-- Generic settings and audit events
create table public.branch_settings (
  branch_id uuid not null references public.branches(id) on delete cascade,
  setting_key text not null,
  setting_value jsonb not null,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (branch_id, setting_key)
);

create table public.system_audit_events (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Row level security can be tailored to the production authentication model.
alter table public.organisations enable row level security;
alter table public.branches enable row level security;
alter table public.profiles enable row level security;
alter table public.financial_entries enable row level security;
alter table public.financial_entry_audits enable row level security;
alter table public.entry_attachments enable row level security;

comment on table public.financial_entry_audits is 'Immutable history of financial entry corrections. Application code should insert records and never update them.';
comment on column public.financial_entries.edit_count is 'Reception users are limited to two edits by application policy. Manager and Admin edits remain audited.';
