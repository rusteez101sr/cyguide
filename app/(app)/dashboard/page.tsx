import { createClient } from "@/lib/supabase-server";
import Link from "next/link";

interface Assignment {
  id: string;
  name: string;
  due_at: string;
  course_name: string;
  url: string;
}

function parseIcal(text: string): Assignment[] {
  const events: Assignment[] = [];
  const blocks = text.split("BEGIN:VEVENT");
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const get = (key: string) => {
      const match = block.match(new RegExp(`${key}[^:]*:([^\r\n]+)`));
      return match ? match[1].trim() : "";
    };
    const dtstart = get("DTSTART");
    const summary = get("SUMMARY");
    const url = get("URL");
    const uid = get("UID");
    if (!dtstart || !summary) continue;
    let due: Date;
    if (dtstart.length === 8) {
      due = new Date(`${dtstart.slice(0, 4)}-${dtstart.slice(4, 6)}-${dtstart.slice(6, 8)}`);
    } else {
      due = new Date(dtstart.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/, "$1-$2-$3T$4:$5:$6Z"));
    }
    if (isNaN(due.getTime())) continue;
    const courseMatch = summary.match(/\(([^)]+)\)\s*$/);
    const course_name = courseMatch ? courseMatch[1] : "";
    const name = summary.replace(/\s*\([^)]+\)\s*$/, "").trim();
    events.push({ id: uid, name, due_at: due.toISOString(), course_name, url });
  }
  return events;
}

function urgencyLabel(dueAt: string): { label: string; color: string } {
  const diffMs = new Date(dueAt).getTime() - Date.now();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffMs < 0) return { label: "Overdue", color: "text-red-600 bg-red-50" };
  if (diffDays < 1) return { label: "Due today", color: "text-orange-600 bg-orange-50" };
  if (diffDays < 3) return { label: "Due soon", color: "text-amber-600 bg-amber-50" };
  return {
    label: new Date(dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    color: "text-gray-500 bg-gray-100",
  };
}

async function getUpcomingAssignments(icalUrl: string | null | undefined): Promise<Assignment[]> {
  if (!icalUrl) return [];
  try {
    const res = await fetch(icalUrl, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const text = await res.text();
    const all = parseIcal(text);
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return all
      .filter((a) => new Date(a.due_at) > cutoff)
      .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())
      .slice(0, 5);
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: student } = await supabase
    .from("students")
    .select("name, major, class_year, canvas_ical_url, onboarding_complete")
    .eq("user_id", user!.id)
    .single();

  // Fall back to profiles for legacy users and canvas_ical_url
  const { data: legacyProfile } = await supabase
    .from("profiles")
    .select("canvas_ical_url")
    .eq("id", user!.id)
    .single();

  const icalUrl = student?.canvas_ical_url ?? legacyProfile?.canvas_ical_url;
  const assignments = await getUpcomingAssignments(icalUrl);
  const hasCanvas = !!icalUrl;

  const firstName = student?.name?.split(" ")[0] ?? user!.email?.split("@")[0] ?? "there";
  const overdue = assignments.filter((a) => new Date(a.due_at) < new Date());
  const dueToday = assignments.filter((a) => {
    const diff = new Date(a.due_at).getTime() - Date.now();
    return diff > 0 && diff < 24 * 60 * 60 * 1000;
  });

  // Upcoming ISU deadlines
  const { data: academicDates } = await supabase
    .from("isu_academic_calendar")
    .select("title, event_date")
    .gte("event_date", new Date().toISOString().split("T")[0])
    .order("event_date")
    .limit(3);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 pb-24 md:pb-8">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Hi, {firstName} 👋</h1>
        <p className="text-gray-500 text-sm mt-1">
          {student?.major ? `${student.major} · ${student.class_year}` : "Here's what's going on with your academics."}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">Upcoming</p>
          <p className="text-2xl font-semibold text-gray-900">{assignments.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">assignments</p>
        </div>
        <div className={`rounded-2xl border p-4 ${dueToday.length > 0 ? "bg-orange-50 border-orange-100" : "bg-white border-gray-100"}`}>
          <p className="text-xs text-gray-400 mb-1">Due today</p>
          <p className={`text-2xl font-semibold ${dueToday.length > 0 ? "text-orange-600" : "text-gray-900"}`}>{dueToday.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">assignments</p>
        </div>
        <div className={`rounded-2xl border p-4 col-span-2 sm:col-span-1 ${overdue.length > 0 ? "bg-red-50 border-red-100" : "bg-white border-gray-100"}`}>
          <p className="text-xs text-gray-400 mb-1">Overdue</p>
          <p className={`text-2xl font-semibold ${overdue.length > 0 ? "text-red-600" : "text-gray-900"}`}>{overdue.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">assignments</p>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { href: "/planning", label: "Academic Plan", icon: "📚" },
          { href: "/calendar", label: "Calendar", icon: "📅" },
          { href: "/events", label: "Campus Events", icon: "🎓" },
          { href: "/dining", label: "Dining", icon: "🍽️" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white rounded-2xl border border-gray-100 p-4 text-center hover:border-red-200 hover:bg-red-50 transition-colors"
          >
            <div className="text-2xl mb-1">{item.icon}</div>
            <p className="text-xs font-medium text-gray-700">{item.label}</p>
          </Link>
        ))}
      </div>

      {/* Ask CyGuide */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: "#C8102E" }}>Cy</div>
          <h2 className="text-sm font-semibold text-gray-900">Ask CyGuide</h2>
        </div>
        <Link href="/chat" className="flex items-center gap-3 w-full text-left rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-400 hover:border-red-200 hover:bg-red-50 transition-colors">
          Ask about policies, courses, dining, or get support…
        </Link>
      </div>

      {/* ISU Deadlines */}
      {academicDates && academicDates.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Upcoming ISU Deadlines</h2>
          <div className="flex flex-col gap-2">
            {academicDates.map((date, i) => (
              <div key={i} className="flex items-center justify-between py-1.5">
                <p className="text-sm text-gray-700">{date.title}</p>
                <p className="text-xs text-gray-400 shrink-0 ml-2">
                  {new Date(date.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              </div>
            ))}
          </div>
          <Link href="/calendar" className="text-xs mt-2 inline-block" style={{ color: "#C8102E" }}>
            See full calendar →
          </Link>
        </div>
      )}

      {/* Upcoming Assignments */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Upcoming Assignments</h2>
          {hasCanvas && (
            <Link href="/assignments" className="text-xs font-medium" style={{ color: "#C8102E" }}>See all →</Link>
          )}
        </div>

        {!hasCanvas ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500 mb-3">Connect your Canvas calendar to see assignments here.</p>
            <Link href="/settings" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-medium" style={{ backgroundColor: "#C8102E" }}>
              Connect Canvas
            </Link>
          </div>
        ) : assignments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No upcoming assignments — you&apos;re all caught up!</p>
        ) : (
          <div className="flex flex-col gap-2">
            {assignments.map((a) => {
              const { label, color } = urgencyLabel(a.due_at);
              return (
                <div key={a.id} className="flex items-start justify-between gap-3 py-2.5 border-b border-gray-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 font-medium truncate">{a.name}</p>
                    {a.course_name && <p className="text-xs text-gray-400 mt-0.5">{a.course_name}</p>}
                  </div>
                  <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${color}`}>{label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
