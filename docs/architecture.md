# Architecture notes

## Current application layer

The current build uses React components and one central typed state object. Data is stored in browser local storage so the project can be deployed and reviewed without backend credentials.

## Production data layer

The interface is intentionally separated from the persistence helper in `src/lib/storage.ts`. A production implementation can replace this helper with a Supabase service without redesigning the pages.

## Audit rules

Every edit creates a separate audit record containing the entire original entry, the updated entry, the edit reason, editor, edit timestamp and sequential edit number. Reception access checks both the 24 hour visibility rule and the two edit limit. Manager and Admin roles use the unlimited correction permission while still creating an audit record.

## Future modules

The database migration includes future entities, but the navigation only exposes current scope pages. New modules can be added as separate pages and services when needed.
