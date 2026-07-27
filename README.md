# Food Pavilion Sales System

This version is connected to the existing Food Pavilion Supabase database schema.

## Required Vercel variable

Add `SUPABASE_SECRET_KEY` in Vercel Project Settings under Environment Variables. Apply it to Production, Preview and Development, then redeploy.

The public Supabase Project URL and Publishable key are configured in `src/lib/supabase.ts`.

## Database

The application uses the existing Food Pavilion tables, including `sales`, `sale_items`, `costs`, `entry_audits`, `entry_attachments`, `orders`, `order_items`, `menu_categories`, `menu_items`, `profiles`, `permissions`, `profile_permissions`, `branch_settings`, `restaurant_tables`, and `deletion_pin_credentials`.

Do not create a `financial_entries` table. It is not part of this database.

Do not run another schema or security migration from this repository. The `supabase/README.txt` file records the expected table names only.

## Application data

Core restaurant data is stored in Supabase. Browser storage is used only for the login session preference and interface preferences.

The Vercel Function at `api/app.ts` handles application data and superadmin user management using the private server key.
