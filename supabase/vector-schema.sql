-- 1. Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- 2. Add an embedding column to the listings table
-- Gemini's text-embedding-004 model outputs 768 dimensions
alter table public.listings add column if not exists embedding vector(768);

-- 3. Create a function to similarity search for listings
-- This function uses cosine distance (<=>) to find the closest matches
create or replace function match_listings (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  title text,
  subtitle text,
  monthly_rent integer,
  location text,
  similarity float
)
language sql stable
as $$
  select
    listings.id,
    listings.title,
    listings.subtitle,
    listings.monthly_rent,
    listings.location,
    1 - (listings.embedding <=> query_embedding) as similarity
  from public.listings
  where listings.status = 'active'
    and 1 - (listings.embedding <=> query_embedding) > match_threshold
  order by listings.embedding <=> query_embedding
  limit match_count;
$$;
