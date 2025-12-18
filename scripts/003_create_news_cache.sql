-- Create a table for caching news API responses
create table if not exists public.news_cache (
  id uuid default gen_random_uuid() primary key,
  cache_key text not null unique,
  category text not null,
  page int not null,
  articles jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone not null,
  unique(category, page)
);

-- Create an index for fast lookups by category and page
create index if not exists news_cache_category_page_idx on public.news_cache(category, page);

-- Create an index for cleaning up expired cache entries
create index if not exists news_cache_expires_at_idx on public.news_cache(expires_at);

-- Enable RLS for news_cache (public read access, no write access for users)
alter table public.news_cache enable row level security;

-- Allow anyone to read from cache (it's public news data)
create policy "Anyone can read news cache" 
on public.news_cache for select 
using (true);

-- Only service role can insert/update cache (done via API routes)
create policy "Service role can insert news cache" 
on public.news_cache for insert 
with check (false);

create policy "Service role can update news cache" 
on public.news_cache for update 
using (false);
