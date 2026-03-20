Design system: dark+light theme with amber/orange (#f59e0b) accent. All text in Portuguese (Brazil). Roles stored in user_roles table, never on profiles.

Security: tokens never stored in localStorage, all edge functions require JWT auth via getClaims(), shopify_connections scoped by user_id with RLS, security_logs table tracks unauthorized access attempts, HTML stripped from user inputs.
