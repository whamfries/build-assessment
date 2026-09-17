-- Existing catalogue items predate moderation, so they remain buyer-visible.
-- New products default to under_review until a moderation workflow approves them.
alter table public.products
  add column moderation_status text default 'under_review';

update public.products
set moderation_status = 'approved';

alter table public.products
  alter column moderation_status set not null,
  add constraint products_moderation_status_check
    check (moderation_status in ('approved', 'under_review'));

drop policy if exists "Public may read available products" on public.products;
create policy "Public may read approved available products"
  on public.products
  for select
  using (is_available = true and moderation_status = 'approved');

create or replace function public.match_products(
  query_embedding vector(1536),
  query_text text default '',
  match_count int default 12,
  max_price_cents int default 500000,
  min_price_cents int default 0,
  filter_brand text default null,
  filter_category text default null,
  filter_condition text default null,
  filter_colour text default null
)
returns setof public.products
language sql stable
as $$
  with scored as (
    select p.id, p.embedding, ts_rank_cd(
      to_tsvector('english', p.search_document),
      websearch_to_tsquery('english', query_text)
    ) as lexical_rank
    from public.products p
    where p.is_available = true
      and p.moderation_status = 'approved'
      and p.embedding is not null
      and p.price_cents between min_price_cents and least(max_price_cents, 500000)
      and (filter_brand is null or lower(p.brand) = lower(filter_brand))
      and (filter_category is null or lower(p.category) = lower(filter_category))
      and (filter_condition is null or lower(p.condition) = lower(filter_condition))
      and (filter_colour is null or lower(p.colour) = lower(filter_colour))
  )
  select p.* from public.products p
  join scored on scored.id = p.id
  order by (scored.embedding <=> query_embedding) - least(scored.lexical_rank * 0.20, 0.20),
           scored.embedding <=> query_embedding
  limit least(match_count, 20);
$$;

-- search_products is not currently called by the application, but it remains
-- subject to the same buyer-visibility rule when deployed in the future.
create or replace function public.search_products(
  query_embedding vector(1536),
  query_text text default '',
  return_all_eligible boolean default false,
  max_price_cents int default 500000,
  min_price_cents int default 0,
  filter_brand text default null,
  filter_category text default null,
  filter_condition text default null,
  filter_colour text default null
)
returns setof public.products
language sql stable
as $$
  with scored as (
    select
      p.id,
      1 - (p.embedding <=> query_embedding) as semantic_similarity,
      ts_rank_cd(
        to_tsvector('english', p.search_document),
        websearch_to_tsquery('english', query_text)
      ) as lexical_rank
    from public.products p
    where p.is_available = true
      and p.moderation_status = 'approved'
      and p.embedding is not null
      and p.price_cents between min_price_cents and least(max_price_cents, 500000)
      and (filter_brand is null or lower(p.brand) = lower(filter_brand))
      and (filter_category is null or lower(p.category) = lower(filter_category))
      and (filter_condition is null or lower(p.condition) = lower(filter_condition))
      and (filter_colour is null or lower(p.colour) = lower(filter_colour))
  ), ranked as (
    select *, semantic_similarity + least(lexical_rank * 0.20, 0.20) as relevance_score
    from scored
  ), threshold as (
    select max(relevance_score) as best_score from ranked
  )
  select p.*
  from public.products p
  join ranked r on r.id = p.id
  cross join threshold t
  where return_all_eligible
    or r.relevance_score >= greatest(t.best_score - 0.12, t.best_score * 0.72)
  order by r.relevance_score desc, r.semantic_similarity desc;
$$;
