import { NextRequest, NextResponse } from "next/server";
import { generateDegreePlan, type StudentProfile, type CourseInfo } from "@/lib/router";
import { createClient } from "@/lib/supabase-server";

async function getStudentProfile(userId: string): Promise<StudentProfile> {
  const supabase = await createClient();

  let {
    data: student,
    error: studentError,
  } = await supabase
    .from("students")
    .select("id, name, net_id, major, class_year, gpa, interests, internships, research, advisor_name, advisor_email, advisor_phone, advisor_office, transcript_summary, transcript_uploaded_at")
    .eq("user_id", userId)
    .single();

  if (studentError && studentError.message?.includes("column")) {
    const retry = await supabase
      .from("students")
      .select("id, name, net_id, major, class_year, gpa")
      .eq("user_id", userId)
      .single();
    student = retry.data as typeof student;
  }

  if (!student) return {};

  let {
    data: courseData,
    error: courseError,
  } = await supabase
    .from("student_courses")
    .select("course_code, course_name, professor_name, professor_email, professor_office, professor_office_hours, grade, credits, semester, status, source")
    .eq("student_id", student.id);

  if (courseError && courseError.message?.includes("column")) {
    const retry = await supabase
      .from("student_courses")
      .select("course_code, course_name, professor_name, professor_email, professor_office, professor_office_hours, grade, credits, semester")
      .eq("student_id", student.id);
    courseData = retry.data as typeof courseData;
  }

  const courses: CourseInfo[] = courseData ?? [];

  return {
    name: student.name,
    net_id: student.net_id,
    major: student.major,
    class_year: student.class_year,
    gpa: student.gpa,
    interests: "interests" in student ? student.interests : undefined,
    internships: "internships" in student ? student.internships : undefined,
    research: "research" in student ? student.research : undefined,
    advisor_name: "advisor_name" in student ? student.advisor_name : undefined,
    advisor_email: "advisor_email" in student ? student.advisor_email : undefined,
    advisor_phone: "advisor_phone" in student ? student.advisor_phone : undefined,
    advisor_office: "advisor_office" in student ? student.advisor_office : undefined,
    transcript_summary: "transcript_summary" in student ? student.transcript_summary : undefined,
    transcript_uploaded_at: "transcript_uploaded_at" in student ? student.transcript_uploaded_at : undefined,
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
