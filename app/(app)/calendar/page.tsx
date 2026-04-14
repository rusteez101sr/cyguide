"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  event_type: string;
  course_code?: string;
  due_date: string;
  source: string;
}

interface AcademicDate {
  id: string;
  title: string;
  event_date: string;
  end_date?: string;
  category: string;
  description?: string;
}

const EVENT_COLORS: Record<string, string> = {
  assignment: "bg-red-500",
  exam: "bg-amber-400",
  project: "bg-red-800",
  deadline: "bg-gray-900",
  event: "bg-gray-400",
};

const EVENT_LABELS: Record<string, string> = {
  assignment: "Assignment",
  exam: "Exam",
  project: "Project",
  deadline: "Deadline",
  event: "Event",
};

const ACADEMIC_COLORS: Record<string, string> = {
  deadline: "bg-gray-900 text-white",
  semester: "bg-blue-600 text-white",
  break: "bg-emerald-600 text-white",
  exams: "bg-amber-500 text-white",
  graduation: "bg-violet-600 text-white",
  financial: "bg-orange-500 text-white",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatFull(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function urgencyDot(due: string): string {
  const diff = new Date(due).getTime() - Date.now();
  const days = diff / (1000 * 60 * 60 * 24);
  if (diff < 0) return "bg-red-500";
  if (days < 1) return "bg-orange-500";
  if (days < 3) return "bg-amber-400";
  return "bg-gray-300";
}

type View = "agenda" | "week" | "add";

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [academic, setAcademic] = useState<AcademicDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("agenda");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");
  const [newEvent, setNewEvent] = useState({
    title: "",
    event_type: "assignment",
    course_code: "",
    due_date: "",
    description: "",
  });

  useEffect(() => {
    fetch("/api/calendar")
      .then((r) => r.json())
      .then((data) => {
        setEvents(data.events ?? []);
        setAcademic(data.academic ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  async function addEvent() {
    if (!newEvent.title || !newEvent.due_date) {
      setAddError("Title and date are required.");
      return;
    }
    setAddLoading(true);
    setAddError("");
    setAddSuccess("");
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newEvent, source: "manual" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEvents((prev) => [...prev, data.event].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()));
      setNewEvent({ title: "", event_type: "assignment", course_code: "", due_date: "", description: "" });
      setAddSuccess("Event added!");
      setTimeout(() => { setAddSuccess(""); setView("agenda"); }, 1500);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add event");
    } finally {
      setAddLoading(false);
    }
  }

  async function deleteEvent(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/calendar?id=${id}`, { method: "DELETE" });
  }

  const upcoming = events.filter((e) => new Date(e.due_date) > new Date(Date.now() - 24 * 60 * 60 * 1000));
  const upcomingAcademic = academic.filter((a) => new Date(a.event_date) >= new Date());

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Calendar</h1>
          <p className="text-sm text-gray-500 mt-1">{upcoming.length} upcoming · {upcomingAcademic.length} ISU deadlines</p>
        </div>
        <button
          onClick={() => setView(view === "add" ? "agenda" : "add")}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#C8102E" }}
        >
          <span className="text-lg leading-none">{view === "add" ? "×" : "+"}</span>
          {view === "add" ? "Cancel" : "Add event"}
        </button>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {(["agenda", "week"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 text-xs font-medium py-2 rounded-lg transition-colors capitalize ${
              view === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {v === "agenda" ? "Agenda" : "This Week"}
          </button>
        ))}
      </div>

      {/* Add Event Form */}
      {view === "add" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Add Event</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Title *</label>
              <input
                type="text"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="Assignment name, exam, etc."
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Type</label>
              <select
                value={newEvent.event_type}
                onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value })}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-red-300 bg-white"
              >
                <option value="assignment">Assignment</option>
                <option value="exam">Exam</option>
                <option value="project">Project</option>
                <option value="deadline">Deadline</option>
                <option value="event">Event</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Course Code</label>
              <input
                type="text"
                value={newEvent.course_code}
                onChange={(e) => setNewEvent({ ...newEvent, course_code: e.target.value })}
                placeholder="e.g. COMS 311"
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Due Date & Time *</label>
              <input
                type="datetime-local"
                value={newEvent.due_date}
                onChange={(e) => setNewEvent({ ...newEvent, due_date: e.target.value })}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
              />
            </div>
          </div>
          {addError && <p className="text-xs text-red-500 mt-3">{addError}</p>}
          {addSuccess && <p className="text-xs text-emerald-600 mt-3">{addSuccess}</p>}
          <button
            onClick={addEvent}
            disabled={addLoading}
            className="mt-4 px-5 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#C8102E" }}
          >
            {addLoading ? "Adding…" : "Add to Calendar"}
          </button>
        </div>
      )}

      {/* ISU Academic Deadlines */}
      {upcomingAcademic.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">ISU Academic Calendar</h2>
          <div className="flex flex-col gap-2">
            {upcomingAcademic.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3">
                <div className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${ACADEMIC_COLORS[a.category] ?? "bg-gray-100 text-gray-600"}`}>
                  {a.category}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                  {a.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{a.description}</p>}
                </div>
                <p className="text-xs text-gray-500 shrink-0">{formatDate(a.event_date)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agenda View */}
      {(view === "agenda" || view === "week") && (
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">Your Events</h2>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 h-16 animate-pulse" />
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <p className="text-gray-500 text-sm">No upcoming events. Add one above or upload a syllabus in Chat.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {upcoming.map((event) => (
                <div key={event.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3 group">
                  <div className={`shrink-0 w-2.5 h-2.5 rounded-full ${urgencyDot(event.due_date)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                      <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded text-white ${EVENT_COLORS[event.event_type] ?? "bg-gray-400"}`}>
                        {EVENT_LABELS[event.event_type] ?? event.event_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {event.course_code && <span className="text-xs text-gray-400">{event.course_code}</span>}
                      <span className="text-xs text-gray-400">{formatDate(event.due_date)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteEvent(event.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
