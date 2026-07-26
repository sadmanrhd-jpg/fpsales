# Architecture notes

## Frontend

React, TypeScript and Vite provide the interface. Pages are permission aware and use shared financial entry components.

## Authentication

The current prototype uses PBKDF2 password hashing in the browser and stores only the password salt and derived hash. The initial state contains one superadmin. The superadmin creates all other accounts, grants grouped granular permissions individually, and controls every password change. Login sessions use session storage by default and local storage only when Remember me is selected.

## Local persistence

`src/lib/storage.ts` is the local data adapter. It stores application data in browser local storage. Temporary login sessions use browser session storage, while remembered sessions use browser local storage. The previous sample data key is not loaded.

## Production adapter

For a shared production system, replace the local adapter with Supabase Auth and PostgreSQL. The supplied migration uses per profile permissions and reserves the superadmin role for complete access.

## Module boundaries

The active modules are dashboard, sales, costs, menu, audit history, reports, users, and settings. Future database tables cover branches, orders, kitchen tokens, tables, inventory, customers, employees, payments, and discounts.
