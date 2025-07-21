import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { marker_id, event_type, session_id } = body
    const user_agent = request.headers.get("user-agent") || "unknown"

    if (!marker_id || !event_type || !session_id) {
      return NextResponse.json({ error: "Missing required fields: marker_id, event_type, session_id" }, { status: 400 })
    }

    const { data: event, error } = await supabaseAdmin
      .from("analytics")
      .insert([
        {
          marker_id,
          event_type,
          session_id,
          user_agent,
          timestamp: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Error logging analytics:", error)
      return NextResponse.json({ error: "Failed to log analytics" }, { status: 500 })
    }

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
