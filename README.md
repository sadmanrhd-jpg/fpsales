# Food Pavilion Sales and Cost Manager

A responsive restaurant sales and cost management application built with React, TypeScript and Vite. The interface is ready for deployment on Vercel.

## Included features

• Dashboard with daily, weekly and monthly summaries

• Sales entries with payment method, note, date, time and creator

• Cost entries with category, description and optional bill attachment

• Reception access limited to the last 24 hours

• Reception editing limited to two edits with a mandatory reason

• Complete audit history with original data, updated data, reason, editor and timestamp

• Manager review access

• Admin user, role, permission, settings and export access

• PDF and CSV financial report exports

• Responsive desktop, tablet and mobile layouts

• Food Pavilion branding and uploaded logo

• Browser local storage for an immediately usable demo

• PostgreSQL and Supabase migration prepared for future restaurant modules

## Run locally

```bash
npm install
npm run dev
```

Open the local address shown by Vite.

## Production build

```bash
npm run build
npm run preview
```

## Deploy to Vercel

1. Upload this folder to a GitHub repository.
2. Import the repository in Vercel.
3. Vercel detects Vite automatically.
4. Use `npm run build` as the build command and `dist` as the output directory.
5. Deploy.

No environment variables are required for the current local storage demo.

## Demo role switching

Use the user selector in the top right corner to preview Reception, Manager and Admin access. This preview control should be replaced by authenticated user sessions when connecting a backend.

## Database readiness

The file `supabase/migrations/202607260001_initial_schema.sql` defines an extensible PostgreSQL schema for:

• Organisations and multiple branches

• Role based permissions

• Financial entries and immutable audit history

• Attachments

• Menu categories and menu items

• Restaurant tables

• Customers and employees

• Orders, order items and kitchen order tokens

• Inventory and stock movements

• Payments and discounts

The unfinished future modules are not visible in the current interface.

## Recommended production connection

Use Supabase Auth for user sessions, PostgreSQL for records and Supabase Storage for uploaded bills. Replace `src/lib/storage.ts` with a remote data adapter while keeping the page and component layer unchanged.
