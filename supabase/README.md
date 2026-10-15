# Database setup (Supabase)

Run these in Supabase -> **SQL Editor**, in this order:

1. `01-profiles-setup.sql` - creates the user roles table and the safe customer-order function (safe, run first).
2. Deploy the app with login, create your logins (Authentication -> Users), then make yourself owner with `03-approve-users.sql`.
3. `02-lockdown.sql` - locks the database. Run only after you have signed in as owner successfully.

Also turn OFF public sign-ups in Supabase (Authentication -> Sign In / Providers -> "Allow new users to sign up"), so only logins you create can exist.

Roles: `owner` (everything), `staff` (POS billing, kitchen, table QR), `pending` (no access until approved).
