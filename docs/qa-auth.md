# Authentication & Multi-tenant QA Checklist

This guide covers the manual checks to run after configuring Supabase and the new login flow.

## Pre-flight
- [ ] Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
- [ ] For migration script, add `SUPABASE_SERVICE_ROLE_KEY` and a `MIGRATION_USER_ID`
- [ ] Run `npm run migrate:data -- <USER_ID>` (optional) to seed existing data

## Sign-up / Login
1. **Create account**
   - Visit `/signup`, create a user
   - Confirm Supabase dashboard shows the new user
2. **Auto redirect**
   - After sign up, confirm redirect to `/app`
3. **Log out / in**
   - Use the header sign-out button and ensure redirect to `/login`
   - Log back in at `/login`

## Data isolation
- [ ] Create a deal and analysis as User A; refresh to ensure they persist
- [ ] Sign out, create User B; confirm User B sees zero records
- [ ] Sign back in as User A; confirm original data intact

## Multi-device session
- [ ] Open `/app` in two tabs; updating a deal in tab A should reflect after refresh in tab B

## Guarded routes
- [ ] Navigate to `/app` when logged out → redirect to `/login`
- [ ] Access `/login` or `/signup` when logged in → verify redirect to `/app`

## Error handling
- [ ] Intentionally enter wrong password → confirm error banner shows
- [ ] Remove Supabase env vars and restart dev server → verify helpful console warning `Supabase environment variables are missing`

## Migration script smoke test (optional)
1. Export a JSON snapshot via the old local-storage export (if available)
2. Run `npm run migrate:data -- <USER_ID> path/to/file.json`
3. Log in as that user, ensure imported deals/analyses appear

## Regression pass
- [ ] Run `npm run lint`
- [ ] Open `/` landing page to verify branding and “Created by Peyton Dowd” footer
- [ ] Ensure `/app` still supports deal workflows (drag/drop, forms, etc.)
