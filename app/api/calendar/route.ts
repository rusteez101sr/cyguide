import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { parseIcal } from "@/lib/ical";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: student } = await supabase
      .from("students")
      .select("id, canvas_ical_url")
      .eq("user_id", user.id)
      .single();

    let canvasUrl = student?.canvas_ical_url;
    if (!canvasUrl) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("canvas_ical_url")
        .eq("id", user.id)
        .single();
      canvasUrl = profile?.canvas_ical_url;
    }

    const promises: Promise<unknown>[] = [
      student
        ? supabase.from("calendar_events").select("*").eq("student_id", student.id).order("due_date")
        : Promise.resolve({ data: [] }),
      supabase.from("isu_academic_calendar").select("*").order("event_date"),
    ];

    const [eventsResult, academicResult] = await Promise.all(promises) as [
      { data: unknown[] | null },
      { data: unknown[] | null }
    ];

    let canvasEvents: Array<{
      id: string;
      title: string;
      event_type: string;
      course_code: string;
      due_date: string;
      source: string;
    }> = [];
    let canvasError: string | null = null;

    if (canvasUrl) {
      try {
        const res = await fetch(canvasUrl, { next: { revalidate: 300 } });
        if (!res.ok) {
          canvasError = "Could not fetch the Canvas calendar feed.";
        } else {
          const text = await res.text();
          canvasEvents = parseIcal(text)
            .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())
            .map((assignment) => ({
              id: `canvas-${assignment.id}`,
              title: assignment.name,
              event_type: "assignment",
              course_code: assignment.course_name,
              due_date: assignment.due_at,
              source: "canvas",
            }));
        }
      } catch {
        canvasError = "Could not fetch the Canvas calendar feed.";
      }
    }

    const dbEvents = (eventsResult.data ?? []) as Array<{ due_date: string }>;
    const allEvents = [...dbEvents, ...canvasEvents].sort(
      (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    );

    return NextResponse.json({
      events: allEvents,
      academic: academicResult.data ?? [],
      hasCanvas: Boolean(canvasUrl),
      canvasAssignmentsCount: canvasEvents.length,
      canvasError,
    });
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
  } catch {
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
      .delete().eq("id", id).eq("student_id", student.id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}
