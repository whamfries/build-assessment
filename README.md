# Atelier Archive

A buyer-only, pre-owned luxury handbag marketplace built with Next.js App Router, Supabase, pgvector, and the server-side CognitioLabs gateway.

## Local setup

1. Copy `.env.example` to `.env.local` and add credentials locally. Never commit this file.
2. Run `npm install` and apply the migrations in order (`001_initial_schema.sql`, then `002_products_embedding_permissions.sql`), then run `supabase/seed.sql` in the Supabase SQL editor (or through your migration workflow). If the initial migration has already been applied, apply `002_products_embedding_permissions.sql` once before running the embed command.
3. Run `npm run embed` once to create and store catalogue embeddings. This needs `SUPABASE_SECRET_KEY` and `CLASSGW_KEY` in `.env.local`.
4. Start with `npm run dev`.

## Deployment

Import the repository in Vercel and add every variable from `.env.example` with its real value. The `NEXT_PUBLIC_` variables are intentionally public Supabase configuration. `SUPABASE_SECRET_KEY` and `CLASSGW_KEY` are server-only and must not receive a `NEXT_PUBLIC_` prefix.

## AI behavior

Search embeds both the factual product catalogue and the shopper query, retrieves matching products through Supabase `pgvector`, then applies price and reliable extracted facets deterministically. The Buyer Assistant receives only retrieved catalogue records and validates cited product IDs before displaying product links.
