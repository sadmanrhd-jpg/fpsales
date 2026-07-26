# Food Pavilion Sales, Cost and Menu Manager

A responsive restaurant management starter application built with React, TypeScript and Vite. The repository is configured for deployment on Vercel.

## Current features

• Email and password sign in

• One initial superadmin account only

• Superadmin account creation for other users

• Manual permission assignment for every user

• Superadmin password change

• Password replacement for any user by the superadmin

• Other users cannot change their own password

• Dashboard with daily, weekly and monthly summaries

• Sales and cost entries

• Reception access limited to the last 24 hours when granted

• Reception editing limited to two edits with a mandatory reason

• Complete financial edit history

• PDF and CSV financial report export

• Menu category and menu item creation

• Menu item editing and availability control

• Responsive desktop, tablet and mobile layouts

• Food Pavilion logo and branding

## Initial state

The application starts with:

• One superadmin account using the credentials supplied for this build

• Zero sales entries

• Zero cost entries

• Zero audit records

• Zero menu categories

• Zero menu items

Change the superadmin password from Settings after the first sign in.

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## Deploy to Vercel

1. Upload this folder to a GitHub repository.
2. Import the repository into Vercel.
3. Use `npm run build` as the build command.
4. Use `dist` as the output directory.
5. Deploy.

## Data and authentication scope

The current deployable build stores users, password hashes, permissions, menu data, sales, costs, and sessions in browser storage. This makes the application immediately usable as a single browser prototype.

Browser storage is not a central database. Accounts and records created in one browser are not automatically shared with another device. For a live multi device restaurant deployment, connect the included Supabase schema and replace the local storage adapter with Supabase Auth, PostgreSQL, and Storage.

## Database readiness

The migration in `supabase/migrations/202607260001_initial_schema.sql` includes:

• Organisations and multiple branches

• Authenticated profiles and superadmin role support

• Per user permissions

• Financial entries and immutable audit history

• Attachments

• Menu categories and menu items

• Restaurant tables

• Customers and employees

• Orders, order items and kitchen order tokens

• Inventory and stock movements

• Payments and discounts
