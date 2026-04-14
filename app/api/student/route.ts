import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: student } = await supabase
      .from("students")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!student) return NextResponse.json({ student: null });

    const { data: courses } = await supabase
      .from("student_courses")
      .select("*")
      .eq("student_id", student.id)
      .order("course_code");

    return NextResponse.json({ student, courses: courses ?? [] });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { courses, ...studentData } = body;

    // Upsert student record
    const { data: student, error: studentErr } = await supabase
      .from("students")
      .upsert({ ...studentData, user_id: user.id, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
      .select()
      .single();

    if (studentErr) throw studentErr;

    // If courses are provided, replace them
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
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
