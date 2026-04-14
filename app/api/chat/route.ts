import { NextRequest, NextResponse } from "next/server";
import { routeChat, type Message, type StudentProfile, type CourseInfo } from "@/lib/router";
import { createClient } from "@/lib/supabase-server";
import { parseIcal, getUpcoming, formatAssignmentsForPrompt } from "@/lib/ical";

interface ChatRequestBody {
  message: string;
  history?: Message[];
}

async function getStudentProfile(userId: string): Promise<StudentProfile> {
  try {
    const supabase = await createClient();
    const { data: student } = await supabase
      .from("students")
      .select("name, net_id, major, class_year, advisor_name, advisor_email, advisor_phone, advisor_office, on_campus, meal_plan, gpa, canvas_ical_url")
      .eq("user_id", userId)
      .single();

    if (!student) {
      // Fall back to legacy profiles table
      const { data: profile } = await supabase
        .from("profiles")
        .select("major, year, canvas_ical_url")
        .eq("id", userId)
        .single();
      return { major: profile?.major, class_year: profile?.year };
    }

    // Fetch enrolled courses
    const { data: studentRecord } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", userId)
      .single();

    let courses: CourseInfo[] = [];
    if (studentRecord) {
      const { data: courseData } = await supabase
        .from("student_courses")
        .select("course_code, course_name, professor_name, professor_email, professor_office, professor_office_hours, grade")
        .eq("student_id", studentRecord.id);
      courses = courseData ?? [];
    }

    return {
      name: student.name,
      net_id: student.net_id,
      major: student.major,
      class_year: student.class_year,
      advisor_name: student.advisor_name,
      advisor_email: student.advisor_email,
      advisor_phone: student.advisor_phone,
      advisor_office: student.advisor_office,
      on_campus: student.on_campus,
      meal_plan: student.meal_plan,
      gpa: student.gpa,
      courses,
    };
  } catch {
    return {};
  }
}

async function getCalendarContext(userId: string): Promise<string> {
  try {
    const supabase = await createClient();

    // Check students table first
    const { data: student } = await supabase
      .from("students")
      .select("canvas_ical_url")
      .eq("user_id", userId)
      .single();

    let icalUrl = student?.canvas_ical_url;

    if (!icalUrl) {
      // Fall back to legacy profiles table
      const { data: profile } = await supabase
        .from("profiles")
        .select("canvas_ical_url")
        .eq("id", userId)
        .single();
      icalUrl = profile?.canvas_ical_url;
    }

    if (!icalUrl) return "";

    const res = await fetch(icalUrl, { next: { revalidate: 300 } });
    if (!res.ok) return "";

    const text = await res.text();
    const all = parseIcal(text);
    const upcoming = getUpcoming(all, 30);
    return formatAssignmentsForPrompt(upcoming);
  } catch {
    return "";
  }
}

async function saveMessages(userId: string, userMsg: string, assistantReply: string, intent: string, model: string) {
  try {
    const supabase = await createClient();
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!student) return;

    await supabase.from("chat_messages").insert([
      { student_id: student.id, role: "user", content: userMsg, intent },
      { student_id: student.id, role: "assistant", content: assistantReply, intent, model_used: model },
    ]);
  } catch {
    // Non-critical — don't fail the response
  }
}

export async function POST(req: NextRequest) {
  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { message, history = [] } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  // Get authenticated user
  let userId: string | null = null;
  let profile: StudentProfile = {};
  let calendarContext = "";

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
      [profile, calendarContext] = await Promise.all([
        getStudentProfile(user.id),
        getCalendarContext(user.id),
      ]);
    }
  } catch {
    // Proceed without auth context
  }

  try {
    const result = await routeChat(message.trim(), history, profile, calendarContext);

    // Save to DB (non-blocking)
    if (userId) {
      saveMessages(userId, message.trim(), result.reply, result.intent, result.model);
    }

    return NextResponse.json(result);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unexpected error";
    console.error("[/api/chat]", errMsg);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
