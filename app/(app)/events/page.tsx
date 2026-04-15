"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
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

const CATEGORIES = ["All", "Career", "Academic", "Social", "Other"] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_STYLES: Record<Category, { pill: string; active: string }> = {
  All:      { pill: "bg-gray-100 text-gray-600",           active: "text-white border-transparent" },
  Career:   { pill: "bg-blue-100 text-blue-700",           active: "bg-blue-600 text-white border-transparent" },
  Academic: { pill: "bg-violet-100 text-violet-700",       active: "bg-violet-600 text-white border-transparent" },
  Social:   { pill: "bg-pink-100 text-pink-700",           active: "bg-pink-500 text-white border-transparent" },
  Other:    { pill: "bg-gray-100 text-gray-600",           active: "bg-gray-700 text-white border-transparent" },
};

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

function EventCard({ event }: { event: CampusEvent }) {
  const style = CATEGORY_STYLES[event.category as Category] ?? CATEGORY_STYLES.Other;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col h-full">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.pill} mb-2 inline-block`}>
            {event.category}
          </span>
          <h3 className="text-sm font-semibold text-gray-900 leading-snug">{event.title}</h3>
        </div>
      </div>

      {event.description && (
        <p className="text-xs text-gray-500 mb-3 leading-relaxed line-clamp-2 flex-1">
          {event.description}
        </p>
      )}

      <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-700">{formatEventDate(event.event_date)}</p>
          {event.location && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">📍 {event.location}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            href={`/chat?q=${encodeURIComponent("Tell me more about " + event.title)}`}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-red-200 hover:text-red-600 transition-colors"
          >
            Ask AI
          </Link>
          {event.url && (
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded-lg text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#C8102E" }}
            >
              Details
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"db" | "live">("live");
  const [error, setError] = useState("");
  const [loadingCategory, setLoadingCategory] = useState<Category | null>(null);

  const fetchEvents = useCallback(async (cat: Category) => {
    setLoading(true);
    setLoadingCategory(cat);
    setError("");
    try {
      const res = await fetch(`/api/events?category=${encodeURIComponent(cat)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("Could not load events.");
      }
      const data = await res.json();
      setEvents(data.events ?? []);
      setSource(data.source ?? "live");
    } catch {
      setEvents([]);
      setSource("db");
      setError("Could not load campus events right now.");
    } finally {
      setLoading(false);
      setLoadingCategory(null);
    }
  }, []);

  useEffect(() => {
    fetchEvents(activeCategory);
  }, [activeCategory, fetchEvents]);

  function handleCategory(cat: Category) {
    if (cat === activeCategory) {
      void fetchEvents(cat);
      return;
    }
    setActiveCategory(cat);
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Campus Events</h1>
          <p className="text-sm text-gray-500 mt-1">
            {loading ? "Loading…" : `${events.length} event${events.length !== 1 ? "s" : ""}`}
            {source === "live" && !loading && (
              <span className="ml-2 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Live from ISU + Google</span>
            )}
          </p>
        </div>
        <Link
          href="/chat?q=What+campus+events+are+happening+at+ISU+this+week"
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Ask CyGuide →
        </Link>
      </div>

      {/* Category filter buttons */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {CATEGORIES.map((cat) => {
          const isActive = cat === activeCategory;
          const style = CATEGORY_STYLES[cat];
          return (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategory(cat)}
              aria-pressed={isActive}
              className={`shrink-0 text-xs px-4 py-1.5 rounded-full border font-medium transition-all ${
                isActive
                  ? cat === "All"
                    ? "text-white border-transparent"
                    : style.active
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              } relative z-10 cursor-pointer touch-manipulation select-none`}
              style={isActive && cat === "All" ? { backgroundColor: "#C8102E" } : undefined}
            >
              <span className="inline-flex items-center gap-1.5">
                {cat}
                {loadingCategory === cat && (
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${isActive ? "bg-white/80" : "bg-red-500"}`} />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Events grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 h-44 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <p className="text-sm text-gray-500">{error}</p>
          <button
            type="button"
            onClick={() => fetchEvents(activeCategory)}
            className="text-sm text-white px-4 py-2 rounded-xl inline-block mt-3"
            style={{ backgroundColor: "#C8102E" }}
          >
            Try again
          </button>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <p className="text-gray-500 text-sm mb-2">No {activeCategory !== "All" ? activeCategory : ""} events found.</p>
          <Link
            href={`/chat?q=${encodeURIComponent(`What ${activeCategory !== "All" ? activeCategory : ""} events are happening at Iowa State University?`)}`}
            className="text-sm text-white px-4 py-2 rounded-xl inline-block mt-2"
            style={{ backgroundColor: "#C8102E" }}
          >
            Ask CyGuide
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
