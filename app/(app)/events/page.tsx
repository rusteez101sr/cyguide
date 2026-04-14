import { createClient } from "@/lib/supabase-server";
import Link from "next/link";

interface CampusEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  event_date: string;
  category: string;
  url?: string;
}

function categoryColor(category: string): string {
  switch (category) {
    case "Career": return "bg-blue-100 text-blue-700";
    case "Academic": return "bg-violet-100 text-violet-700";
    case "Social": return "bg-pink-100 text-pink-700";
    case "Cultural": return "bg-amber-100 text-amber-700";
    case "Sports": return "bg-emerald-100 text-emerald-700";
    default: return "bg-gray-100 text-gray-600";
  }
}

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function isUpcoming(dateStr: string): boolean {
  return new Date(dateStr) >= new Date(Date.now() - 60 * 60 * 1000);
}

export default async function EventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get student info for personalized recommendations
  const { data: student } = await supabase
    .from("students")
    .select("major, class_year")
    .eq("user_id", user!.id)
    .single();

  const { data: events } = await supabase
    .from("campus_events")
    .select("*")
    .order("event_date");

  const upcoming = (events ?? []).filter((e) => isUpcoming(e.event_date));
  const categories = ["All", "Career", "Academic", "Social", "Cultural", "Sports"];

  // Personalized recommendations based on major
  const isSTEM = student?.major && ["Computer Science", "Computer Engineering", "Electrical Engineering", "Mechanical Engineering", "Mathematics", "Physics", "Biology"].includes(student.major);
  const isBusiness = student?.major?.toLowerCase().includes("business");

  const recommended = upcoming.filter((e) => {
    if (isSTEM && (e.category === "Career" || e.category === "Academic")) return true;
    if (isBusiness && e.category === "Career") return true;
    return false;
  }).slice(0, 3);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 pb-24 md:pb-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Campus Events</h1>
          <p className="text-sm text-gray-500 mt-1">{upcoming.length} upcoming events</p>
        </div>
        <Link href="/chat?q=What+campus+events+are+happening+this+week" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          Ask CyGuide →
        </Link>
      </div>

      {/* Personalized recommendations */}
      {recommended.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
            Recommended for {student?.major ?? "you"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recommended.map((event) => (
              <div key={event.id} className="bg-white rounded-2xl border-2 p-4 relative" style={{ borderColor: "#C8102E" }}>
                <div className="absolute -top-2.5 left-4">
                  <span className="bg-red-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${categoryColor(event.category)} mb-2 inline-block`}>
                  {event.category}
                </span>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{event.title}</h3>
                <p className="text-xs text-gray-400">{formatEventDate(event.event_date)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category filter (visual only - server rendered) */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {categories.map((cat) => (
          <span
            key={cat}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full border font-medium ${
              cat === "All"
                ? "text-white border-transparent"
                : "bg-white text-gray-600 border-gray-200"
            }`}
            style={cat === "All" ? { backgroundColor: "#C8102E" } : undefined}
          >
            {cat}
          </span>
        ))}
      </div>

      {/* All events */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {upcoming.map((event) => (
          <div key={event.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${categoryColor(event.category)} mb-2 inline-block`}>
                  {event.category}
                </span>
                <h3 className="text-sm font-semibold text-gray-900">{event.title}</h3>
              </div>
            </div>

            {event.description && (
              <p className="text-xs text-gray-500 mb-3 leading-relaxed line-clamp-2">{event.description}</p>
            )}

            <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-700">{formatEventDate(event.event_date)}</p>
                {event.location && <p className="text-xs text-gray-400 mt-0.5">📍 {event.location}</p>}
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/chat?q=Tell+me+more+about+${encodeURIComponent(event.title)}`}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-red-200 hover:text-red-600 transition-colors"
                >
                  Details
                </Link>
                {event.url && (
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 rounded-lg text-white hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: "#C8102E" }}
                  >
                    Learn more
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {upcoming.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <p className="text-gray-500 text-sm">No upcoming events found. Check back soon!</p>
        </div>
      )}
    </div>
  );
}
