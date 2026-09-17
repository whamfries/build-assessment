create extension if not exists vector;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  brand text not null,
  model text not null,
  title text not null,
  category text not null check (category in ('Shoulder Bag','Top Handle','Tote','Crossbody','Clutch','Satchel','Hobo','Backpack')),
  price_cents integer not null check (price_cents > 0 and price_cents <= 500000),
  condition text not null check (condition in ('Excellent','Very Good','Good')),
  description text not null,
  colour text,
  material text,
  size text,
  hardware text,
  style_tags text[] not null default '{}',
  occasion_tags text[] not null default '{}',
  image_urls text[] not null default '{}',
  seller_name text,
  seller_location text,
  condition_notes text,
  included_items text,
  authenticity_status text,
  authenticity_notes text,
  is_available boolean not null default true,
  search_document text not null,
  embedding vector(1536),
  embedding_updated_at timestamptz,
  created_at timestamptz not null default now()
);

create index products_price_idx on public.products(price_cents);
create index products_facets_idx on public.products(brand, category, condition);
create index products_embedding_idx on public.products using ivfflat (embedding vector_cosine_ops) with (lists = 10);

alter table public.products enable row level security;
create policy "Public may read available products" on public.products for select using (is_available = true);

create or replace function public.match_products(query_embedding vector(1536), match_count int default 12, max_price_cents int default 500000, min_price_cents int default 0, filter_brand text default null, filter_category text default null, filter_condition text default null)
returns setof public.products
language sql stable
as $$
  select * from public.products
  where is_available = true and embedding is not null
    and price_cents between min_price_cents and least(max_price_cents, 500000)
    and (filter_brand is null or lower(brand) = lower(filter_brand))
    and (filter_category is null or lower(category) = lower(filter_category))
    and (filter_condition is null or lower(condition) = lower(filter_condition))
  order by embedding <=> query_embedding
  limit least(match_count, 20);
$$;
