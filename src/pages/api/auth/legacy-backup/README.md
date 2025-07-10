# Legacy Auth Routes Backup

These files are the original authentication routes before migrating to Better Auth.
They are kept here as a reference during the migration process.

## Migration Notes

- `index.ts` - Handled user session validation and getting current user
- `login.ts` - Handled user login with email/password
- `logout.ts` - Handled user logout and session cleanup
- `register.ts` - Handled new user registration

All these endpoints are now handled by Better Auth through the catch-all route `[...all].ts`.