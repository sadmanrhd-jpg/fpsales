# Food Pavilion Sales, Cost and Menu Manager

A responsive restaurant management application built with React, TypeScript, Vite, Supabase and Vercel Functions.

## What is connected

The application now uses:

• Supabase Auth for email and password login

• Supabase PostgreSQL for users, permissions, sales, costs, edit history, menu, orders and settings

• Supabase Storage for optional cost attachments

• A secure Vercel Function for database actions that require the private Supabase Secret key

• Browser storage only for the Remember me choice and Supabase session

There is no sample sales, cost, category, menu item or local fallback superadmin data in the repository.

## Required Vercel setting

The Project URL and Publishable key supplied for this project are already configured as safe frontend fallbacks.

You only need to add one private environment variable in Vercel:

```text
SUPABASE_SECRET_KEY=your Supabase Secret key
```

Do not prefix the private key with `VITE_`. Do not place it in GitHub.

The server also accepts `SUPABASE_SERVICE_ROLE_KEY` when your Supabase project still uses a legacy service role key.

## Deploy to Vercel

1. Upload this folder to your GitHub repository.
2. Open Vercel and import the repository.
3. Open Project Settings, then Environment Variables.
4. Add `SUPABASE_SECRET_KEY` with your Supabase Secret key.
5. Enable it for Production, Preview and Development.
6. Deploy or redeploy the project.

Vercel should detect Vite automatically. The expected build command is `npm run build` and the output folder is `dist`.

## First live test

1. Sign in with the superadmin Supabase account.
2. Open Users and create one temporary Reception user.
3. Assign only the required Reception permissions.
4. Open Menu and add one temporary category and item.
5. Sign in from another browser or device and confirm that the same menu appears.
6. Add a temporary sale and cost.
7. Confirm that both appear for the superadmin on another device.
8. Delete the temporary records before entering real restaurant data.

## Local development

Create `.env.local` in the project root:

```text
VITE_SUPABASE_URL=https://ubiwpygjplsvcjsfzoxu.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_v0mtlfR8teOu-tDfkwMERQ_eagIJhYk
SUPABASE_SECRET_KEY=your Supabase Secret key
```

Then run:

```bash
npm install
npm run dev
```

The private key is needed by the local Vercel Function. For full local function testing, use Vercel CLI with `vercel dev`. Normal `npm run dev` runs only the Vite frontend.

## Database expectations

The connected Supabase project must already contain the schema in:

```text
supabase/migrations/202607260001_initial_schema.sql
```

For the server only security model, run this additional idempotent migration once in the Supabase SQL Editor:

```text
supabase/migrations/202607260002_server_only_security.sql
```

This enables Row Level Security on every application table. No browser table policies are required because database operations pass through the secure Vercel Function.

It must also contain:

• An organisation

• A branch

• A superadmin Auth user

• A matching row in `profiles`

• The superadmin profile linked to the organisation and default branch

The Vercel Function automatically maintains the permission catalogue when the superadmin creates or updates users.
