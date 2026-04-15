"use client";

import { useState } from "react";
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

const categories = ["All", "Career", "Academic", "Social", "Cultural", "Sports"];

export default function EventsClient({ events }: { events: CampusEvent[] }) {
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = activeCategory === "All"
    ? events
    : events.filter((e) => e.category === activeCategory);

  return (
    <>
      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {categories.map((cat) => {
          const isActive = cat === activeCategory;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                isActive
                  ? "text-white border-transparent"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
              }`}
              style={isActive ? { backgroundColor: "#C8102E" } : undefined}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Event list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map((event) => (
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

      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <p className="text-gray-500 text-sm">
            {activeCategory === "All"
              ? "No upcoming events found. Check back soon!"
              : `No upcoming ${activeCategory} events found.`}
          </p>
        </div>
      )}
    </>
  );
}
