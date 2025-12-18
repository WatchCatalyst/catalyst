-- Add time_range column to news_cache table
ALTER TABLE news_cache ADD COLUMN IF NOT EXISTS time_range TEXT DEFAULT 'all';

-- Update cache_key to be unique with time_range
ALTER TABLE news_cache DROP CONSTRAINT IF EXISTS news_cache_pkey;
ALTER TABLE news_cache DROP CONSTRAINT IF EXISTS news_cache_category_page_key;

-- Create new unique constraint on cache_key
ALTER TABLE news_cache ADD PRIMARY KEY (cache_key);

-- Create index on time_range for faster queries
CREATE INDEX IF NOT EXISTS idx_news_cache_time_range ON news_cache(time_range);

-- Create composite index for category, page, time_range lookups
CREATE INDEX IF NOT EXISTS idx_news_cache_lookup ON news_cache(category, page, time_range);
