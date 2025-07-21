import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET() {
  try {
    const { data: markers, error } = await supabaseAdmin
      .from("markers")
      .select("*")
      .order("created_at", { ascending: false })


    if (error) {
      console.error("Error fetching markers:", error)
      return NextResponse.json({ error: "Failed to fetch markers" }, { status: 500 })
    }

    return NextResponse.json(markers)
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, marker_image_url, video_url, physical_width = 0.2 } = body

    if (!title || !marker_image_url || !video_url) {
      return NextResponse.json(
        { error: "Missing required fields: title, marker_image_url, video_url" },
        { status: 400 },
      )
    }

    const { data: marker, error } = await supabaseAdmin
      .from("markers")
      .insert([{ title, marker_image_url, video_url, physical_width }])
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(marker, { status: 201 })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Missing marker ID" }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from("markers").delete().eq("id", id)

    if (error) {
      console.error("Error deleting marker:", error)
      return NextResponse.json({ error: "Failed to delete marker" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
