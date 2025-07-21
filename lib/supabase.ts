import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export type Marker = {
  id: string
  title: string
  marker_image_url: string
  video_url: string
  physical_width: number
  created_at: string
  updated_at: string
}

export type AnalyticsEvent = {
  id: string
  marker_id: string
  event_type: "scan" | "play" | "pause" | "complete"
  timestamp: string
  user_agent: string
  session_id: string
}
console.log(
  'service key loaded:',
  !!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.length,
);