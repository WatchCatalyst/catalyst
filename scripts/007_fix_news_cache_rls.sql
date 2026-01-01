-- Fix news_cache RLS policies
-- The original policies blocked ALL writes (with check (false))
-- Since news_cache is public cache data (not user-specific), we'll disable RLS

-- Drop the broken policies
DROP POLICY IF EXISTS "Service role can insert news cache" ON public.news_cache;
DROP POLICY IF EXISTS "Service role can update news cache" ON public.news_cache;
DROP POLICY IF EXISTS "Anyone can read news cache" ON public.news_cache;

-- Disable RLS on news_cache table
-- This is safe because:
-- 1. It's just cached API data, not user data
-- 2. All data is public (news articles)
-- 3. Server-side code needs to write to it
ALTER TABLE public.news_cache DISABLE ROW LEVEL SECURITY;

-- Alternatively, if you want to keep RLS enabled but allow writes:
-- (Uncomment these if you prefer RLS with proper policies)
--
-- ALTER TABLE public.news_cache ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY "Anyone can read news cache" 
-- ON public.news_cache FOR SELECT 
-- USING (true);
-- 
-- CREATE POLICY "Server can insert news cache" 
-- ON public.news_cache FOR INSERT 
-- WITH CHECK (true);
-- 
-- CREATE POLICY "Server can update news cache" 
-- ON public.news_cache FOR UPDATE 
-- USING (true);
-- 
-- CREATE POLICY "Server can delete news cache" 
-- ON public.news_cache FOR DELETE 
-- USING (true);
