import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { codes } = await req.json();
    if (!codes || !Array.isArray(codes)) {
      return NextResponse.json({ found: [], notFound: [] });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Look up each course code in canvas_courses
    const upperCodes = codes.map((c: string) => c.toUpperCase().trim());
    const { data: found } = await supabase
      .from("canvas_courses")
      .select("course_code, course_name, professor_name, professor_email, professor_office, professor_office_hours, credits")
      .in("course_code", upperCodes);

    const foundCodes = (found ?? []).map((c) => c.course_code);
    const notFound = upperCodes.filter((c) => !foundCodes.includes(c));

    // If student has a profile, auto-add found courses
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (student && found && found.length > 0) {
      // Remove existing courses for this semester first
      await supabase.from("student_courses")
        .delete()
        .eq("student_id", student.id)
        .in("course_code", foundCodes);

      await supabase.from("student_courses").insert(
        found.map((c) => ({
          student_id: student.id,
          course_code: c.course_code,
          course_name: c.course_name,
          professor_name: c.professor_name,
          professor_email: c.professor_email,
          professor_office: c.professor_office,
          professor_office_hours: c.professor_office_hours,
          credits: c.credits,
          semester: "Spring 2026",
        }))
      );

      // Add not-found courses as placeholders
      if (notFound.length > 0) {
        await supabase.from("student_courses").insert(
          notFound.map((code) => ({
            student_id: student.id,
            course_code: code,
            course_name: code,
            semester: "Spring 2026",
          }))
        );
      }
    }

    return NextResponse.json({ found: found ?? [], notFound });
  } catch (err) {
    console.error("[courses-lookup]", err);
    return NextResponse.json({ found: [], notFound: [] });
  }
}
