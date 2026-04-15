import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { parseIcal, getUpcoming } from "@/lib/ical";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: student } = await supabase
      .from("students").select("id").eq("user_id", user.id).single();

    if (!student) return NextResponse.json({ events: [], academic: [], assignments: [] });

    // Query students (primary) and profiles (legacy fallback) in parallel
    const [{ data: events }, { data: academic }, { data: studentRecord }, { data: profile }] = await Promise.all([
      supabase.from("calendar_events").select("*").eq("student_id", student.id).order("due_date"),
      supabase.from("isu_academic_calendar").select("*").order("event_date"),
      supabase.from("students").select("canvas_ical_url").eq("user_id", user.id).single(),
      supabase.from("profiles").select("canvas_ical_url").eq("id", user.id).single(),
    ]);

    // Fetch Canvas assignments for the calendar (4 months ahead)
    const icalUrl = studentRecord?.canvas_ical_url ?? profile?.canvas_ical_url;
    let assignments: ReturnType<typeof getUpcoming> = [];
    if (icalUrl) {
      try {
        const res = await fetch(icalUrl, { next: { revalidate: 300 } });
        if (res.ok) {
          const text = await res.text();
          assignments = getUpcoming(parseIcal(text), 120);
        }
      } catch {}
    }

    return NextResponse.json({ events: events ?? [], academic: academic ?? [], assignments });
  } catch {
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: student } = await supabase
      .from("students").select("id").eq("user_id", user.id).single();
    if (!student) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const body = await req.json();
    const { data, error } = await supabase
      .from("calendar_events")
      .insert({ ...body, student_id: student.id })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ event: data });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const { data: student } = await supabase
      .from("students").select("id").eq("user_id", user.id).single();
    if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await supabase.from("calendar_events")
      .delete()
      .eq("id", id)
      .eq("student_id", student.id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}
