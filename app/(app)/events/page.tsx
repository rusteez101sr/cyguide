import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import EventsClient from "./EventsClient";

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

      <EventsClient events={upcoming} />
    </div>
  );
}
