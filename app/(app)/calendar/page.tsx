"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";

interface Assignment {
  id: string;
  name: string;
  due_at: string;
  course_name: string;
  url: string;
}

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

type CalendarItem =
  | { kind: "canvas"; data: Assignment }
  | { kind: "manual"; data: CalendarEvent };

const ACADEMIC_COLORS: Record<string, string> = {
  deadline: "bg-gray-900 text-white",
  semester: "bg-blue-600 text-white",
  break: "bg-emerald-600 text-white",
  exams: "bg-amber-500 text-white",
  graduation: "bg-violet-600 text-white",
  financial: "bg-orange-500 text-white",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getMonthGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const grid: Date[] = [];
  // Leading days from previous month
  for (let i = 0; i < firstDay.getDay(); i++) {
    grid.push(new Date(year, month, 1 - (firstDay.getDay() - i)));
  }
  // Days of this month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    grid.push(new Date(year, month, d));
  }
  // Trailing days to fill 6 rows × 7 cols = 42 cells
  let trailing = 1;
  while (grid.length < 42) {
    grid.push(new Date(year, month + 1, trailing++));
  }
  return grid;
}

function getWeekDays(date: Date): Date[] {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - d.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(sunday);
    day.setDate(sunday.getDate() + i);
    return day;
  });
}

function itemsForDay(assignments: Assignment[], events: CalendarEvent[], day: Date): CalendarItem[] {
  const items: CalendarItem[] = [
    ...assignments
      .filter((a) => isSameDay(new Date(a.due_at), day))
      .map((a) => ({ kind: "canvas" as const, data: a })),
    ...events
      .filter((e) => isSameDay(new Date(e.due_date), day))
      .map((e) => ({ kind: "manual" as const, data: e })),
  ];
  return items.sort((a, b) => {
    const aT = a.kind === "canvas" ? new Date(a.data.due_at).getTime() : new Date(a.data.due_date).getTime();
    const bT = b.kind === "canvas" ? new Date(b.data.due_at).getTime() : new Date(b.data.due_date).getTime();
    return aT - bT;
  });
}

function urgencyPillColor(dueAt: string): string {
  const days = (new Date(dueAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (days <= 3) return "bg-red-100 text-red-700 border-red-200";
  if (days <= 5) return "bg-yellow-100 text-yellow-700 border-yellow-200";
  return "bg-green-100 text-green-700 border-green-200";
}

function urgencyDotColor(dueAt: string): string {
  const days = (new Date(dueAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (days <= 3) return "bg-red-500";
  if (days <= 5) return "bg-yellow-400";
  return "bg-green-500";
}

function itemPillColor(item: CalendarItem): string {
  if (item.kind === "canvas") return urgencyPillColor(item.data.due_at);
  return "bg-gray-100 text-gray-700 border-gray-200";
}

function itemDotColor(item: CalendarItem): string {
  if (item.kind === "canvas") return urgencyDotColor(item.data.due_at);
  return "bg-gray-400";
}

function itemDate(item: CalendarItem): string {
  return item.kind === "canvas" ? item.data.due_at : item.data.due_date;
}

function itemLabel(item: CalendarItem): string {
  return item.kind === "canvas" ? item.data.name : item.data.title;
}

function itemSub(item: CalendarItem): string {
  return item.kind === "canvas" ? item.data.course_name : (item.data.course_code ?? "");
}

function itemUrl(item: CalendarItem): string | undefined {
  return item.kind === "canvas" ? item.data.url : undefined;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit",
  });
}

type View = "calendar" | "week" | "add";

export default function CalendarPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [academic, setAcademic] = useState<AcademicDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("calendar");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
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
        setAssignments(data.assignments ?? []);
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
      setEvents((prev: CalendarEvent[]) =>
        [...prev, data.event as CalendarEvent].sort(
          (a: CalendarEvent, b: CalendarEvent) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        )
      );
      setNewEvent({ title: "", event_type: "assignment", course_code: "", due_date: "", description: "" });
      setAddSuccess("Event added!");
      setTimeout(() => { setAddSuccess(""); setView("calendar"); }, 1500);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add event");
    } finally {
      setAddLoading(false);
    }
  }

  async function deleteEvent(id: string) {
    setEvents((prev: CalendarEvent[]) => prev.filter((e: CalendarEvent) => e.id !== id));
    await fetch(`/api/calendar?id=${id}`, { method: "DELETE" });
  }

  const today = new Date();
  const upcomingAcademic = academic.filter((a: AcademicDate) => new Date(a.event_date) >= today);
  const monthGrid = getMonthGrid(currentMonth.getFullYear(), currentMonth.getMonth());
  const weekDays = getWeekDays(today);
  const selectedDayItems = selectedDay ? itemsForDay(assignments, events, selectedDay) : [];

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Calendar</h1>
          <p className="text-sm text-gray-500 mt-1">
            {assignments.length} Canvas deadlines · {upcomingAcademic.length} ISU dates
          </p>
        </div>
        <button
          onClick={() => setView(view === "add" ? "calendar" : "add")}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#C8102E" }}
        >
          <span className="text-lg leading-none">{view === "add" ? "×" : "+"}</span>
          {view === "add" ? "Cancel" : "Add event"}
        </button>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {(["calendar", "week"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 text-xs font-medium py-2 rounded-lg transition-colors capitalize ${
              view === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {v === "calendar" ? "Calendar" : "This Week"}
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

      {/* Calendar View */}
      {view === "calendar" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() =>
                setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
              }
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 text-lg"
            >
              ‹
            </button>
            <h2 className="text-sm font-semibold text-gray-900">
              {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h2>
            <button
              onClick={() =>
                setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
              }
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 text-lg"
            >
              ›
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-center text-[11px] font-medium text-gray-400 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          {loading ? (
            <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-xl overflow-hidden">
              {Array.from({ length: 42 }).map((_, i) => (
                <div key={i} className="bg-white min-h-[72px] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-xl overflow-hidden">
              {monthGrid.map((day, idx) => {
                const isThisMonth = day.getMonth() === currentMonth.getMonth();
                const isToday = isSameDay(day, today);
                const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
                const dayItems = isThisMonth ? itemsForDay(assignments, events, day) : [];

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (!isThisMonth) return;
                      setSelectedDay(isSelected ? null : day);
                    }}
                    className={`bg-white min-h-[72px] p-1 transition-colors ${
                      isThisMonth ? "cursor-pointer hover:bg-gray-50" : "cursor-default"
                    } ${isSelected ? "ring-2 ring-inset ring-red-400" : ""}`}
                  >
                    {/* Day number */}
                    <div
                      className={`text-xs font-medium w-5 h-5 ml-auto flex items-center justify-center rounded-full mb-0.5 ${
                        isToday
                          ? "text-white"
                          : isThisMonth
                          ? "text-gray-700"
                          : "text-gray-300"
                      }`}
                      style={isToday ? { backgroundColor: "#C8102E" } : undefined}
                    >
                      {day.getDate()}
                    </div>

                    {/* Assignment pills (desktop) / dots (mobile) */}
                    {dayItems.length > 0 && (
                      <div className="flex flex-col gap-0.5">
                        {dayItems.slice(0, 2).map((item) => (
                          <a
                            key={item.kind + item.data.id}
                            href={itemUrl(item) || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className={`hidden sm:block text-[10px] px-1 py-0.5 rounded truncate border leading-tight ${itemPillColor(item)}`}
                            title={itemLabel(item)}
                          >
                            {itemLabel(item)}
                          </a>
                        ))}
                        {/* Mobile: colored dots */}
                        <div className="sm:hidden flex gap-0.5 flex-wrap mt-0.5">
                          {dayItems.slice(0, 4).map((item) => (
                            <div
                              key={item.kind + item.data.id}
                              className={`w-1.5 h-1.5 rounded-full ${itemDotColor(item)}`}
                            />
                          ))}
                        </div>
                        {dayItems.length > 2 && (
                          <span className="hidden sm:block text-[10px] text-gray-400 px-1 leading-tight">
                            +{dayItems.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Selected day detail panel */}
          {selectedDay && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {selectedDay.toLocaleDateString("en-US", {
                  weekday: "long", month: "long", day: "numeric",
                })}
              </h3>
              {selectedDayItems.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  No assignments due this day.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {selectedDayItems.map((item) => (
                    <div
                      key={item.kind + item.data.id}
                      className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3"
                    >
                      <div className={`shrink-0 w-2 h-2 rounded-full ${itemDotColor(item)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 leading-snug truncate">
                          {itemLabel(item)}
                        </p>
                        {itemSub(item) && (
                          <p className="text-xs text-gray-400 mt-0.5">{itemSub(item)}</p>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-3">
                        <p className="text-xs text-gray-400">{formatTime(itemDate(item))}</p>
                        {item.kind === "canvas" && item.data.url && (
                          <a
                            href={item.data.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium"
                            style={{ color: "#C8102E" }}
                          >
                            Open →
                          </a>
                        )}
                        {item.kind === "manual" && (
                          <button
                            onClick={() => {
                              deleteEvent(item.data.id);
                              if (selectedDayItems.length === 1) setSelectedDay(null);
                            }}
                            className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
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
          )}
        </div>
      )}

      {/* This Week View */}
      {view === "week" && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
            {weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            {" – "}
            {weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
          <div className="overflow-x-auto pb-2">
            <div className="grid grid-cols-7 gap-2 min-w-[560px]">
              {weekDays.map((day) => {
                const isToday = isSameDay(day, today);
                const dayItems = itemsForDay(assignments, events, day);
                return (
                  <div
                    key={day.toDateString()}
                    className={`bg-white rounded-xl border p-2 min-h-[120px] flex flex-col ${
                      isToday ? "border-red-200" : "border-gray-100"
                    }`}
                  >
                    <div
                      className={`text-[11px] font-medium uppercase tracking-wider leading-none mb-0.5 ${
                        isToday ? "text-red-600" : "text-gray-400"
                      }`}
                    >
                      {day.toLocaleDateString("en-US", { weekday: "short" })}
                    </div>
                    <div
                      className={`text-sm font-semibold mb-2 ${
                        isToday ? "text-red-600" : "text-gray-900"
                      }`}
                    >
                      {day.getDate()}
                    </div>
                    {loading ? (
                      <div className="h-5 bg-gray-100 rounded animate-pulse" />
                    ) : dayItems.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="w-4 h-px bg-gray-200" />
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {dayItems.map((item) => (
                          item.kind === "canvas" && item.data.url ? (
                            <a
                              key={item.kind + item.data.id}
                              href={item.data.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`block text-[10px] px-1.5 py-1 rounded-lg border truncate ${itemPillColor(item)}`}
                              title={`${itemLabel(item)}${itemSub(item) ? ` (${itemSub(item)})` : ""}`}
                            >
                              {itemLabel(item)}
                            </a>
                          ) : (
                            <div
                              key={item.kind + item.data.id}
                              className={`text-[10px] px-1.5 py-1 rounded-lg border truncate ${itemPillColor(item)}`}
                              title={`${itemLabel(item)}${itemSub(item) ? ` (${itemSub(item)})` : ""}`}
                            >
                              {itemLabel(item)}
                            </div>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ISU Academic Calendar */}
      {upcomingAcademic.length > 0 && view !== "add" && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
            ISU Academic Calendar
          </h2>
          <div className="flex flex-col gap-2">
            {upcomingAcademic.slice(0, 5).map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3"
              >
                <div
                  className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    ACADEMIC_COLORS[a.category] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {a.category}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                  {a.description && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{a.description}</p>
                  )}
                </div>
                <p className="text-xs text-gray-500 shrink-0">{formatDate(a.event_date)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
