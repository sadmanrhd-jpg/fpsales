# Architecture notes

## Frontend

React, TypeScript and Vite provide the interface. The browser uses the Supabase Publishable key only for authentication and session management.

## Secure server layer

`api/app.ts` is a Vercel Function. It receives the signed in user's Supabase access token, verifies the token, loads the application profile, checks role and permissions, and then performs the requested database action.

The Supabase Secret key is used only inside this Vercel Function. It is never included in the browser bundle.

## Data storage

Supabase PostgreSQL stores:

• Profiles and permissions

• Sales and costs

• Financial edit history

• Menu categories and menu items

• Ongoing orders and order items

• Restaurant and branch settings

Deletion PIN credentials are salted and hashed by the server and stored as private branch settings. Plain PIN values are not stored.

Optional financial attachments are stored in a private Supabase Storage bucket named `financial-entry-attachments`. The server creates the bucket when the first attachment is uploaded.

## Authentication

Login uses Supabase Auth email and password authentication. The superadmin creates other Auth users from the Users page through the secure Vercel Function.

The application does not provide password change controls to non-superadmin users. The superadmin can replace any user's password from the Users page.

## Session persistence

The Supabase session is stored in session storage by default. Selecting Remember me stores it in local storage on that device.

## Permission enforcement

The interface hides unavailable actions, but the Vercel Function independently checks permissions before every protected database operation. Superadmin access cannot be reduced from the application.
