import { createClient } from "@/lib/supabase-server";
import Link from "next/link";

interface Assignment {
  id: number;
  name: string;
  due_at: string | null;
  course_name: string;
  course_code: string;
  points_possible: number;
  html_url: string;
  submission_types: string[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatGroupDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function urgencyColor(dueAt: string): string {
  const diffMs = new Date(dueAt).getTime() - Date.now();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffMs < 0) return "bg-red-500";
  if (diffDays < 1) return "bg-orange-500";
  if (diffDays < 3) return "bg-amber-400";
  return "bg-gray-300";
}

function groupByDay(assignments: Assignment[]): Map<string, Assignment[]> {
  const map = new Map<string, Assignment[]>();
  for (const a of assignments) {
    if (!a.due_at) continue;
    const key = new Date(a.due_at).toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  }
  return map;
}

async function fetchAssignments(userId: string) {
  const { createClient: createServer } = await import("@/lib/supabase-server");
  const supabase = await createServer();

  const { data: profile } = await supabase
    .from("profiles")
    .select("canvas_token, canvas_url")
    .eq("id", userId)
    .single();

  if (!profile?.canvas_token) return { assignments: [], hasToken: false };

  const baseUrl = profile.canvas_url || "https://canvas.iastate.edu";

  const coursesRes = await fetch(
    `${baseUrl}/api/v1/courses?enrollment_state=active&per_page=50`,
    { headers: { Authorization: `Bearer ${profile.canvas_token}` }, next: { revalidate: 300 } }
  );

  if (!coursesRes.ok) return { assignments: [], hasToken: true, error: "Canvas API error. Check your token in Settings." };

  const courses = await coursesRes.json();

  const assignmentPromises = courses.map(
    async (course: { id: number; name: string; course_code: string }) => {
      const r = await fetch(
        `${baseUrl}/api/v1/courses/${course.id}/assignments?per_page=50&order_by=due_at`,
        { headers: { Authorization: `Bearer ${profile.canvas_token}` }, next: { revalidate: 300 } }
      );
      if (!r.ok) return [];
      const list = await r.json();
      return list.map((a: Assignment) => ({
        ...a,
        course_name: course.name,
        course_code: course.course_code,
      }));
    }
  );

  const all = (await Promise.all(assignmentPromises)).flat() as Assignment[];
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // include overdue up to 1 day ago
  const filtered = all
    .filter((a) => a.due_at && new Date(a.due_at) > cutoff)
    .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime());

  return { assignments: filtered, hasToken: true };
}

export default async function AssignmentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { assignments, hasToken, error } = await fetchAssignments(user!.id);
  const grouped = groupByDay(assignments);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 pb-24 md:pb-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Assignments</h1>
          <p className="text-sm text-gray-500 mt-1">Synced from Canvas</p>
        </div>
        {hasToken && (
          <Link
            href="/settings"
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Manage Canvas →
          </Link>
        )}
      </div>

      {!hasToken ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-gray-400">
              <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Connect your Canvas account</h2>
          <p className="text-sm text-gray-500 mb-5 max-w-xs mx-auto">
            Add your Canvas API token to sync your courses and assignment due dates.
          </p>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white text-sm font-medium"
            style={{ backgroundColor: "#C8102E" }}
          >
            Go to Settings
          </Link>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-sm text-red-600">
          {error}
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <p className="text-gray-500 text-sm">No upcoming assignments — you&apos;re all caught up!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Array.from(grouped.entries()).map(([dateStr, items]) => (
            <div key={dateStr}>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                {formatGroupDate(items[0].due_at!)}
              </h2>
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                {items.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 px-5 py-4">
                    <div className={`mt-1.5 shrink-0 w-2 h-2 rounded-full ${urgencyColor(a.due_at!)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 leading-snug">{a.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{a.course_code || a.course_name}</span>
                        {a.points_possible > 0 && (
                          <>
                            <span className="text-gray-200">·</span>
                            <span className="text-xs text-gray-400">{a.points_possible} pts</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-gray-400">{formatDate(a.due_at!)}</p>
                      {a.html_url && (
                        <a
                          href={a.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium mt-1 inline-block"
                          style={{ color: "#C8102E" }}
                        >
                          Open →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
