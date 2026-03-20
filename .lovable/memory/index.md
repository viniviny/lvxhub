Design system: "Oceano Profundo" palette (GitHub Dark style). Primary #1F6FEB, accent #388BFD, bg #0D1117, surface #161B22, card #1C2333. Flat and minimal — no gradients, no glow. All text in Portuguese (Brazil). Roles stored in user_roles table, never on profiles.

Security: tokens never stored in localStorage, all edge functions require JWT auth via getClaims(), shopify_connections scoped by user_id with RLS, security_logs table tracks unauthorized access attempts, HTML stripped from user inputs.
