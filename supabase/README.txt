DATABASE NOTICE

This repository is configured for the existing Food Pavilion Supabase database.

Do not run a new schema migration from this repository.
Do not create a financial_entries table.

The application expects these existing tables:

organisations
branches
profiles
permissions
profile_permissions
deletion_pin_credentials
branch_settings
restaurant_tables
menu_categories
menu_items
cost_categories
orders
order_items
sales
sale_items
costs
entry_audits
entry_attachments
audit_logs

The database schema and security policies were already installed separately in Supabase.
