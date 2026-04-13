import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/openrouter";
import { createClient } from "@/lib/supabase-server";
import { parseIcal, getUpcoming, formatAssignmentsForPrompt } from "@/lib/ical";

interface ChatRequestBody {
  message: string;
  history?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  profile?: Record<string, string>;
}

async function getCalendarContext(userId: string): Promise<string> {
  try {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("canvas_ical_url, major, year")
      .eq("id", userId)
      .single();

    if (!profile?.canvas_ical_url) return "";

    const res = await fetch(profile.canvas_ical_url, { next: { revalidate: 300 } });
    if (!res.ok) return "";

    const text = await res.text();
    const all = parseIcal(text);
    const upcoming = getUpcoming(all);
    return formatAssignmentsForPrompt(upcoming);
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  let body: ChatRequestBody;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }

  const { message, history = [], profile = {} } = body;

  if (!message || typeof message !== "string" || message.trim() === "") {
    return NextResponse.json(
      { error: "message is required and must be a non-empty string" },
      { status: 400 }
    );
  }

  // Get the authenticated user to fetch their calendar
  let calendarContext = "";
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      calendarContext = await getCalendarContext(user.id);
    }
  } catch {
    // If auth fails, proceed without calendar context
  }

  try {
    const result = await chat(message.trim(), history, profile, calendarContext);
    return NextResponse.json(result);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "An unexpected error occurred";
    console.error("[/api/chat]", errMsg);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
