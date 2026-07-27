# Architecture notes

## Frontend

React, TypeScript and Vite provide the interface. The browser uses the Supabase Publishable key only for authentication and session management.

## Secure server layer

`api/app.ts` is a Vercel Function. It receives the signed in user Supabase access token, verifies the token, loads the application profile, checks the role and permissions, and performs the requested database action.

The Supabase Secret key is used only inside this Vercel Function. It is not included in the browser bundle.

## Data storage

Supabase PostgreSQL stores profiles, permissions, sales, sale items, costs, financial edit history, menu categories, menu items, ongoing orders, order items, tables, branch settings, deletion PIN credentials and audit logs.

Optional sale and cost attachments are stored in a private Supabase Storage bucket named `entry_attachments`.

## Authentication

Login uses Supabase Auth email and password authentication. The superadmin creates other Auth users from the Users page through the secure Vercel Function.

The superadmin can replace another user password from the Users page.

## Session persistence

The Supabase session is stored in session storage by default. Selecting Remember me stores it in local storage on that device.

## Permission enforcement

The interface hides unavailable actions. The Vercel Function also checks the signed in user role and permissions. Database functions and policies remain active for user scoped operations.
