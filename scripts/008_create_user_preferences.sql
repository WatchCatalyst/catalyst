-- User Preferences Table
-- Run this SQL in Supabase SQL Editor to create the user preferences table
-- This enables users to sync their preferences across devices when signed in

-- Create user preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Watchlist/Portfolio
  watchlist JSONB DEFAULT '[]'::jsonb,
  
  -- Notification settings
  notifications_enabled BOOLEAN DEFAULT true,
  notification_categories TEXT[] DEFAULT ARRAY['crypto', 'stocks'],
  notification_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Feed settings
  min_relevance_score INTEGER DEFAULT 60 CHECK (min_relevance_score >= 0 AND min_relevance_score <= 100),
  selected_topics TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- UI preferences
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'system')),
  view_mode TEXT DEFAULT 'card' CHECK (view_mode IN ('card', 'compact')),
  
  -- Bookmarks
  bookmarked_article_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One preference record per user
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Enable Row Level Security (RLS)
-- This ensures users can ONLY access their own preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own preferences
CREATE POLICY "Users can view own preferences"
  ON user_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own preferences
CREATE POLICY "Users can insert own preferences"
  ON user_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update own preferences"
  ON user_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own preferences
CREATE POLICY "Users can delete own preferences"
  ON user_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on any change
DROP TRIGGER IF EXISTS trigger_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER trigger_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON user_preferences TO authenticated;
