import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Try students table first
    const { data: student, error } = await supabase
      .from("students")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error || !student) {
      // Fall back to profiles table
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!profile) return NextResponse.json({ student: null, courses: [] });

      // Map profiles columns to student shape
      return NextResponse.json({
        student: {
          user_id: user.id,
          major: profile.major,
          class_year: profile.year,
          canvas_ical_url: profile.canvas_ical_url,
          onboarding_complete: true,
        },
        courses: [],
      });
    }

    const { data: courses } = await supabase
      .from("student_courses")
      .select("*")
      .eq("student_id", student.id)
      .order("course_code");

    return NextResponse.json({ student, courses: courses ?? [] });
  } catch {
    return NextResponse.json({ student: null, courses: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { courses, ...studentData } = body;

    // Try students table first
    const { data: student, error: studentErr } = await supabase
      .from("students")
      .upsert(
        { ...studentData, user_id: user.id, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (studentErr) {
      // students table doesn't exist yet — fall back to profiles table
      const { error: profileErr } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          major: studentData.major,
          year: studentData.class_year,
          canvas_ical_url: studentData.canvas_ical_url ?? null,
        });

      if (profileErr) throw profileErr;

      return NextResponse.json({
        success: true,
        student: { user_id: user.id, ...studentData, onboarding_complete: true },
        fallback: true,
      });
    }

    // Handle courses if students table exists
    if (courses && Array.isArray(courses) && student) {
      await supabase.from("student_courses").delete().eq("student_id", student.id);
      if (courses.length > 0) {
        await supabase.from("student_courses").insert(
          courses.map((c: Record<string, unknown>) => ({ ...c, student_id: student.id }))
        );
      }
    }

    return NextResponse.json({ success: true, student });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save profile";
    console.error("[POST /api/student]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
