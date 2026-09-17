-- Keep the catalogue readable through the public API, but never writable by
-- browser-facing roles. The embedding job authenticates as service_role.
revoke all privileges on table public.products from public;
revoke all privileges on table public.products from anon, authenticated, service_role;

grant select on table public.products to anon, authenticated;

-- service_role is the server-side embedding job. It bypasses the products RLS
-- policy, so no write policy is required; its table writes remain limited to
-- the generated vector and timestamp.
grant select on table public.products to service_role;
grant update (embedding, embedding_updated_at) on table public.products to service_role;
