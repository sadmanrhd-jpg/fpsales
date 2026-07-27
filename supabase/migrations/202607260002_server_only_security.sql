-- Security hardening for the Vercel Function architecture.
-- The browser uses Supabase only for Auth. Application table access is handled
-- by api/app.ts with the private server key after permission checks.

alter table public.organisations enable row level security;
alter table public.branches enable row level security;
alter table public.profiles enable row level security;
alter table public.permissions enable row level security;
alter table public.profile_permissions enable row level security;
alter table public.financial_entries enable row level security;
alter table public.entry_attachments enable row level security;
alter table public.financial_entry_audits enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.customers enable row level security;
alter table public.employees enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.kitchen_order_tokens enable row level security;
alter table public.discounts enable row level security;
alter table public.payments enable row level security;
alter table public.inventory_items enable row level security;
alter table public.branch_inventory enable row level security;
alter table public.stock_movements enable row level security;
alter table public.branch_settings enable row level security;
alter table public.system_audit_events enable row level security;
