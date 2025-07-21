-- Create markers table
CREATE TABLE IF NOT EXISTS markers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  marker_image_url TEXT NOT NULL,
  video_url TEXT NOT NULL,
  physical_width DECIMAL(5,3) DEFAULT 0.2,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analytics table
CREATE TABLE IF NOT EXISTS analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  marker_id UUID REFERENCES markers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('scan', 'play', 'pause', 'complete')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  session_id TEXT NOT NULL
);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('marker-images', 'marker-images', true),
  ('marker-videos', 'marker-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies
ALTER TABLE markers ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- Allow public read access to markers
CREATE POLICY "Public can read markers" ON markers
  FOR SELECT USING (true);

-- Allow public insert/update/delete for markers (you may want to restrict this)
CREATE POLICY "Public can manage markers" ON markers
  FOR ALL USING (true);

-- Allow public insert for analytics
CREATE POLICY "Public can insert analytics" ON analytics
  FOR INSERT WITH CHECK (true);

-- Allow public read for analytics
CREATE POLICY "Public can read analytics" ON analytics
  FOR SELECT USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_markers_created_at ON markers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_marker_id ON analytics(marker_id);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp DESC);
