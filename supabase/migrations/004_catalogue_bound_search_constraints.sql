-- Apply this after the existing hybrid-search migration. It adds a catalogue
-- colour constraint without allowing arbitrary natural-language terms to act
-- as impossible SQL filters.
drop function if exists public.match_products(vector, text, integer, integer, integer, text, text, text);
drop function if exists public.match_products(vector, integer, integer, integer, text, text, text);

create function public.match_products(
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
    where p.is_available = true and p.embedding is not null
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
