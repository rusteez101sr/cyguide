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
  description?: string;
  event_date: string;
  end_date?: string | null;
  category: string;
}

interface DayItem {
  id: string;
  title: string;
  date: string;
  label: string;
  tone: string;
  meta?: string;
  description?: string;
  deletable?: boolean;
  source: "calendar" | "academic";
}

const TYPE_COLOR: Record<string, string> = {
  assignment: "bg-red-500",
  exam: "bg-amber-500",
  project: "bg-violet-500",
  deadline: "bg-gray-800",
  event: "bg-blue-500",
};

const TYPE_LABEL: Record<string, string> = {
  assignment: "Assignment",
  exam: "Exam",
  project: "Project",
  deadline: "Deadline",
  event: "Event",
};

const ACADEMIC_COLOR: Record<string, string> = {
  deadline: "bg-gray-800 text-white",
  semester: "bg-blue-600 text-white",
  break: "bg-emerald-600 text-white",
  exams: "bg-amber-500 text-white",
  graduation: "bg-violet-600 text-white",
  financial: "bg-orange-500 text-white",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function isoDateKey(iso: string): string {
  const date = new Date(iso);
  return dateKey(date);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function urgencyColor(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const days = diff / 86400000;
  if (diff < 0) return "bg-red-500";
  if (days < 1) return "bg-orange-500";
  if (days < 3) return "bg-amber-400";
  return "bg-blue-400";
}

function isSameMonth(iso: string, month: number, year: number): boolean {
  const date = new Date(iso);
  return date.getFullYear() === year && date.getMonth() === month;
}

export default function CalendarPage() {
  const today = new Date();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [academic, setAcademic] = useState<AcademicDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasCanvas, setHasCanvas] = useState(false);
  const [canvasAssignmentsCount, setCanvasAssignmentsCount] = useState(0);
  const [canvasError, setCanvasError] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<string>(dateKey(today));
  const [showAdd, setShowAdd] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    event_type: "assignment",
    course_code: "",
    due_date: "",
    description: "",
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  useEffect(() => {
    async function loadCalendar() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch("/api/calendar", { cache: "no-store" });
        if (!res.ok) {
          throw new Error("Could not load calendar data.");
        }

        const data = await res.json();
        setEvents(data.events ?? []);
        setAcademic(data.academic ?? []);
        setHasCanvas(data.hasCanvas ?? false);
        setCanvasAssignmentsCount(data.canvasAssignmentsCount ?? 0);
        setCanvasError(data.canvasError ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load calendar data.");
      } finally {
        setLoading(false);
      }
    }

    loadCalendar();
  }, []);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const selectedDate = (() => {
    const [year, month, day] = selectedDay.split("-").map(Number);
    return new Date(year, month, day);
  })();

  const eventsByDay: Record<string, CalendarEvent[]> = {};
  for (const event of events) {
    const key = isoDateKey(event.due_date);
    if (!eventsByDay[key]) eventsByDay[key] = [];
    eventsByDay[key].push(event);
  }

  const academicByDay: Record<string, AcademicDate[]> = {};
  for (const item of academic) {
    const key = isoDateKey(item.event_date);
    if (!academicByDay[key]) academicByDay[key] = [];
    academicByDay[key].push(item);
  }

  const selectedEvents = eventsByDay[selectedDay] ?? [];
  const selectedAcademic = academicByDay[selectedDay] ?? [];
  const selectedItems: DayItem[] = [
    ...selectedAcademic.map((item) => ({
      id: item.id,
      title: item.title,
      date: item.event_date,
      label: "ISU Deadline",
      tone: ACADEMIC_COLOR[item.category] ?? "bg-blue-600 text-white",
      description: item.description,
      source: "academic" as const,
    })),
    ...selectedEvents.map((event) => ({
      id: event.id,
      title: event.title,
      date: event.due_date,
      label: TYPE_LABEL[event.event_type] ?? event.event_type,
      tone: `${TYPE_COLOR[event.event_type] ?? "bg-gray-400"} text-white`,
      meta: [event.course_code, formatTime(event.due_date), event.source === "canvas" ? "Canvas" : "Custom"].filter(Boolean).join(" · "),
      description: event.description,
      deletable: !event.id.startsWith("canvas-"),
      source: "calendar" as const,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const upcomingAssignments = events
    .filter((event) => new Date(event.due_date).getTime() >= Date.now() - 86400000)
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 12);

  const monthAssignmentCount = events.filter((event) => isSameMonth(event.due_date, viewMonth, viewYear)).length;
  const monthAcademicCount = academic.filter((event) => isSameMonth(event.event_date, viewMonth, viewYear)).length;

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((year) => year - 1);
    } else {
      setViewMonth((month) => month - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((year) => year + 1);
    } else {
      setViewMonth((month) => month + 1);
    }
  }

  function jumpToToday() {
    setViewMonth(today.getMonth());
    setViewYear(today.getFullYear());
    setSelectedDay(dateKey(today));
  }

  async function addEvent() {
    if (!newEvent.title || !newEvent.due_date) {
      setAddError("Title and date are required.");
      return;
    }

    setAddLoading(true);
    setAddError("");

    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newEvent, source: "manual" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setEvents((prev) => [...prev, data.event].sort(
        (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      ));
      setNewEvent({ title: "", event_type: "assignment", course_code: "", due_date: "", description: "" });
      setShowAdd(false);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add event.");
    } finally {
      setAddLoading(false);
    }
  }

  async function deleteEvent(id: string) {
    setEvents((prev) => prev.filter((event) => event.id !== id));
    await fetch(`/api/calendar?id=${id}`, { method: "DELETE" });
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 pb-24 md:pb-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Calendar</h1>
          <p className="text-sm text-gray-500 mt-1">
            {hasCanvas
              ? `Canvas connected · ${canvasAssignmentsCount} assignment${canvasAssignmentsCount === 1 ? "" : "s"} in your feed`
              : "Connect Canvas in Settings to see assignment due dates here."}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={jumpToToday}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:border-gray-300 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setShowAdd((value) => !value)}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#C8102E" }}
          >
            <span className="text-lg leading-none">{showAdd ? "×" : "+"}</span>
            {showAdd ? "Cancel" : "Add event"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">Canvas assignments</p>
          <p className="text-2xl font-semibold text-gray-900">{canvasAssignmentsCount}</p>
          <p className="text-xs text-gray-400 mt-0.5">{hasCanvas ? "synced from Canvas" : "connect in Settings"}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">This month</p>
          <p className="text-2xl font-semibold text-gray-900">{monthAssignmentCount + monthAcademicCount}</p>
          <p className="text-xs text-gray-400 mt-0.5">{monthAssignmentCount} assignments · {monthAcademicCount} ISU dates</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">Selected day</p>
          <p className="text-2xl font-semibold text-gray-900">{selectedItems.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </p>
        </div>
      </div>

      {!hasCanvas && !loading && !error && (
        <div className="mb-5 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <span className="text-base">📅</span>
          <span>Connect Canvas to automatically place assignment due dates on your calendar.</span>
          <a href="/settings" className="ml-auto shrink-0 font-medium underline underline-offset-2">Settings →</a>
        </div>
      )}

      {hasCanvas && canvasError && !loading && (
        <div className="mb-5 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <span className="text-base">!</span>
          <span>{canvasError} Check the feed URL in Settings.</span>
          <a href="/settings" className="ml-auto shrink-0 font-medium underline underline-offset-2">Settings →</a>
        </div>
      )}

      {showAdd && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Add Event</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Title *</label>
              <input
                type="text"
                placeholder="Assignment, exam, meeting…"
                value={newEvent.title}
                onChange={(e) => setNewEvent((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Type</label>
              <select
                value={newEvent.event_type}
                onChange={(e) => setNewEvent((prev) => ({ ...prev, event_type: e.target.value }))}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-red-300"
              >
                <option value="assignment">Assignment</option>
                <option value="exam">Exam</option>
                <option value="project">Project</option>
                <option value="deadline">Deadline</option>
                <option value="event">Event</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Course Code</label>
              <input
                type="text"
                placeholder="e.g. COMS 311"
                value={newEvent.course_code}
                onChange={(e) => setNewEvent((prev) => ({ ...prev, course_code: e.target.value }))}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Date & Time *</label>
              <input
                type="datetime-local"
                value={newEvent.due_date}
                onChange={(e) => setNewEvent((prev) => ({ ...prev, due_date: e.target.value }))}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Notes</label>
            <textarea
              value={newEvent.description}
              onChange={(e) => setNewEvent((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              placeholder="Optional details for this event."
              className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 resize-none"
            />
          </div>
          {addError && <p className="text-xs text-red-500 mt-2">{addError}</p>}
          <button
            onClick={addEvent}
            disabled={addLoading}
            className="mt-4 px-5 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#C8102E" }}
          >
            {addLoading ? "Adding…" : "Add to Calendar"}
          </button>
        </div>
      )}

      {error ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <p className="text-sm text-gray-500 mb-3">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl text-white text-sm"
            style={{ backgroundColor: "#C8102E" }}
          >
            Reload calendar
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] gap-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Previous month">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-500">
                  <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                </svg>
              </button>
              <div className="text-center">
                <h2 className="text-sm font-semibold text-gray-900">{MONTHS[viewMonth]} {viewYear}</h2>
                <p className="text-[11px] text-gray-400 mt-1">{monthAssignmentCount} assignments · {monthAcademicCount} ISU dates</p>
              </div>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Next month">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-500">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="overflow-x-auto -mx-2 px-2">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {DAYS.map((day) => (
                    <div key={day} className="text-center text-[10px] font-semibold text-gray-400 pb-1">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: firstDay }).map((_, index) => (
                    <div key={`empty-${index}`} className="min-h-[110px]" />
                  ))}

                  {Array.from({ length: daysInMonth }).map((_, index) => {
                    const day = index + 1;
                    const cellDate = new Date(viewYear, viewMonth, day);
                    const key = dateKey(cellDate);
                    const isToday = key === dateKey(today);
                    const isSelected = key === selectedDay;
                    const dayEvents = eventsByDay[key] ?? [];
                    const dayAcademic = academicByDay[key] ?? [];
                    const previewItems = [
                      ...dayEvents.map((event) => ({
                        id: event.id,
                        title: event.title,
                        color: TYPE_COLOR[event.event_type] ?? "bg-gray-400",
                      })),
                      ...dayAcademic.map((item) => ({
                        id: item.id,
                        title: item.title,
                        color: "bg-blue-500",
                      })),
                    ];
                    const hiddenCount = previewItems.length - Math.min(previewItems.length, 2);

                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(key)}
                        className={`rounded-2xl border p-2 text-left min-h-[110px] transition-colors ${
                          isSelected
                            ? "border-transparent text-white"
                            : isToday
                            ? "border-red-200 bg-red-50"
                            : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                        }`}
                        style={isSelected ? { backgroundColor: "#C8102E" } : undefined}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-semibold ${isSelected ? "text-white" : "text-gray-900"}`}>{day}</span>
                          {previewItems.length > 0 && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                              {previewItems.length}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col gap-1">
                          {previewItems.slice(0, 2).map((item) => (
                            <div
                              key={item.id}
                              className={`rounded-lg px-2 py-1 text-[10px] leading-tight truncate ${isSelected ? "bg-white/15 text-white" : "bg-gray-50 text-gray-600"}`}
                            >
                              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${isSelected ? "bg-white/80" : item.color}`} />
                              {item.title}
                            </div>
                          ))}
                          {hiddenCount > 0 && (
                            <div className={`text-[10px] ${isSelected ? "text-white/80" : "text-gray-400"}`}>
                              +{hiddenCount} more
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-50 flex flex-wrap gap-3">
              {[
                { color: "bg-red-500", label: "Assignment" },
                { color: "bg-amber-500", label: "Exam" },
                { color: "bg-violet-500", label: "Project" },
                { color: "bg-blue-500", label: "ISU date" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-[10px] text-gray-500">
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </h3>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : selectedItems.length === 0 ? (
                <p className="text-xs text-gray-400 py-3 text-center">No items scheduled for this day.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {selectedItems.map((item) => (
                    <div key={item.id} className="rounded-xl border border-gray-100 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.tone}`}>
                            {item.label}
                          </div>
                          <p className="text-sm font-medium text-gray-900 mt-2">{item.title}</p>
                          {item.meta && <p className="text-[11px] text-gray-400 mt-1">{item.meta}</p>}
                          {item.description && <p className="text-xs text-gray-500 mt-2 leading-relaxed">{item.description}</p>}
                        </div>
                        {item.deletable && (
                          <button
                            onClick={() => deleteEvent(item.id)}
                            className="text-gray-300 hover:text-red-400 transition-colors text-base leading-none shrink-0"
                            aria-label={`Delete ${item.title}`}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Upcoming assignments & events</h3>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, index) => (
                    <div key={index} className="h-8 bg-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : upcomingAssignments.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">
                  {hasCanvas ? "No upcoming assignments or events." : "Connect Canvas to see assignment due dates here."}
                </p>
              ) : (
                <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto">
                  {upcomingAssignments.map((event) => (
                    <div key={event.id} className="flex items-center gap-2">
                      <span className={`shrink-0 w-2 h-2 rounded-full ${urgencyColor(event.due_date)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate leading-snug">{event.title}</p>
                        <p className="text-[10px] text-gray-400">
                          {[event.course_code, formatShortDate(event.due_date), event.source === "canvas" ? "Canvas" : "Custom"].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <span className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded text-white ${TYPE_COLOR[event.event_type] ?? "bg-gray-400"}`}>
                        {TYPE_LABEL[event.event_type] ?? event.event_type}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
