-- Seller submissions remain private until a separate trusted moderation flow
-- approves them. Existing catalogue rows intentionally keep seller_id null.
alter table public.products
  add column seller_id uuid references auth.users(id),
  add column pending_image_paths text[];

create index products_seller_id_idx on public.products(seller_id);

-- Browser-facing sellers can insert a deliberately narrow submission shape.
-- There is intentionally no UPDATE grant for authenticated users.
grant insert (
  id, slug, brand, model, title, category, price_cents, condition,
  description, colour, material, style_tags, occasion_tags, seller_name,
  image_urls, pending_image_paths, is_available, search_document,
  seller_id, moderation_status
) on public.products to authenticated;

create policy "Sellers may create their own under-review products"
  on public.products
  for insert
  to authenticated
  with check (
    seller_id = (select auth.uid())
    and moderation_status = 'under_review'
    and is_available = true
    and cardinality(image_urls) = 0
    and cardinality(pending_image_paths) = 3
    and pending_image_paths[1] ~ ('^' || (select auth.uid())::text || '/' || id::text || '/front[.](jpg|jpeg|png|webp)$')
    and pending_image_paths[2] ~ ('^' || (select auth.uid())::text || '/' || id::text || '/back[.](jpg|jpeg|png|webp)$')
    and pending_image_paths[3] ~ ('^' || (select auth.uid())::text || '/' || id::text || '/side[.](jpg|jpeg|png|webp)$')
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'seller'
    )
  );

create policy "Sellers may read their own under-review products"
  on public.products
  for select
  to authenticated
  using (
    seller_id = (select auth.uid())
    and moderation_status = 'under_review'
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'seller'
    )
  );

-- A profile role is an authorization attribute, not user-editable profile data.
-- Keep self-service display-name updates and own-profile reads intact.
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'seller-submissions',
  'seller-submissions',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
);

create policy "Sellers may upload their own pending submission images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'seller-submissions'
    and owner_id = (select auth.uid())::text
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and array_length(storage.foldername(name), 1) = 2
    and storage.filename(name) ~ '^(front|back|side)[.](jpg|jpeg|png|webp)$'
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'seller'
    )
  );

create policy "Sellers may read their own pending submission images"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'seller-submissions'
    and owner_id = (select auth.uid())::text
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'seller'
    )
  );

-- Allows best-effort cleanup if the database insert fails after upload.
create policy "Sellers may delete their own pending submission images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'seller-submissions'
    and owner_id = (select auth.uid())::text
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'seller'
    )
  );
