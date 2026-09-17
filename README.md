# Atelier Archive

A buyer-first, pre-owned luxury handbag marketplace built with Next.js App Router, Supabase, pgvector, and the server-side CognitioLabs gateway.

The buyer experience is supported by authentication and Buyer/Seller profiles; sellers can persist private, image-backed submissions, which remain at `under_review` pending a separate moderation flow.

## Local setup

1. Run `npm install`. Copy `.env.example` to `.env.local`, populate it with local credentials, and never commit `.env.local`.
2. Apply `supabase/migrations/001_initial_schema.sql`, then load `supabase/seed.sql`. Apply migrations `002` through `009` in numerical order. The seed must precede `008_product_moderation_status.sql`, which marks the existing catalogue as approved.
3. When the catalogue is ready for embeddings, run `npm run embed`. This requires `SUPABASE_SECRET_KEY` and `CLASSGW_KEY` in `.env.local`.
4. Run `npm run dev` to start the local application.

## Deployment

Import the repository in Vercel and configure its environment variables from `.env.example`. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are intentionally browser-facing Supabase configuration. `SUPABASE_SECRET_KEY` and `CLASSGW_KEY` are server-only and must not receive a `NEXT_PUBLIC_` prefix.

## AI behavior

Search embeds both the factual product catalogue and the shopper query, retrieves matching products through Supabase `pgvector`, then applies price and reliable extracted facets deterministically. The Buyer Assistant receives only retrieved catalogue records and validates cited product IDs before displaying product links.
