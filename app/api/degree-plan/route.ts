import { NextRequest, NextResponse } from "next/server";
import { generateDegreePlan, type StudentProfile, type CourseInfo } from "@/lib/router";
import { createClient } from "@/lib/supabase-server";

async function getStudentProfile(userId: string): Promise<StudentProfile> {
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("id, name, net_id, major, class_year, gpa")
    .eq("user_id", userId)
    .single();

  if (!student) return {};

  const { data: courseData } = await supabase
    .from("student_courses")
    .select("course_code, course_name, professor_name, grade")
    .eq("student_id", student.id);

  const courses: CourseInfo[] = courseData ?? [];

  return {
    name: student.name,
    net_id: student.net_id,
    major: student.major,
    class_year: student.class_year,
    gpa: student.gpa,
    courses,
  };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const scenario = body.scenario as string | undefined;

    const profile = await getStudentProfile(user.id);
    if (!profile.major) {
      return NextResponse.json({ error: "Complete your profile first to generate a degree plan." }, { status: 400 });
    }

    // If there's a what-if scenario, append it to the profile context
    if (scenario) {
      const plan = await generateDegreePlan({
        ...profile,
      });
      // Re-run with scenario context
      const { routeChat } = await import("@/lib/router");
      const result = await routeChat(
        `What-if scenario: ${scenario}\n\nGiven my profile above, analyze this scenario and explain the impact on my degree plan.`,
        [],
        profile,
        "",
        ""
      );
      return NextResponse.json({ plan: result.reply, model: result.model, scenario: true });
    }

    const plan = await generateDegreePlan(profile);
    return NextResponse.json({ plan, model: "gpt-4o" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to generate degree plan";
    console.error("[/api/degree-plan]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
