export interface Assignment {
  id: string;
  name: string;
  due_at: string;
  course_name: string;
  url: string;
}

// Canvas iCal URLs point to the calendar event page, e.g.:
// https://canvas.iastate.edu/calendar?event_id=assignment_12345&include_contexts=course_678
// Transform these into the direct assignment URL:
// https://canvas.iastate.edu/courses/678/assignments/12345
function resolveAssignmentUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    const eventId = u.searchParams.get("event_id");
    const context = u.searchParams.get("include_contexts");
    if (eventId?.startsWith("assignment_") && context?.startsWith("course_")) {
      const assignmentId = eventId.slice("assignment_".length);
      const courseId = context.slice("course_".length);
      return `${u.origin}/courses/${courseId}/assignments/${assignmentId}`;
    }
  } catch {}
  return rawUrl;
}

export function parseIcal(text: string): Assignment[] {
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
      due = new Date(
        dtstart.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/, "$1-$2-$3T$4:$5:$6Z")
      );
    }

    if (isNaN(due.getTime())) continue;

    const courseMatch = summary.match(/\(([^)]+)\)\s*$/);
    const course_name = courseMatch ? courseMatch[1] : "";
    const name = summary.replace(/\s*\([^)]+\)\s*$/, "").trim();

    events.push({ id: uid, name, due_at: due.toISOString(), course_name, url: resolveAssignmentUrl(url) });
  }

  return events;
}

export function getUpcoming(assignments: Assignment[], days = 30): Assignment[] {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const limit = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return assignments
    .filter((a) => new Date(a.due_at) > cutoff && new Date(a.due_at) < limit)
    .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());
}

export function formatAssignmentsForPrompt(assignments: Assignment[]): string {
  if (assignments.length === 0) return "No upcoming assignments in the next 30 days.";

  const now = new Date();
  return assignments
    .map((a) => {
      const due = new Date(a.due_at);
      const diffMs = due.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const dueStr = due.toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric",
        hour: "numeric", minute: "2-digit",
      });

      let urgency = "";
      if (diffMs < 0) urgency = " [OVERDUE]";
      else if (diffDays === 0) urgency = " [DUE TODAY]";
      else if (diffDays === 1) urgency = " [DUE TOMORROW]";
      else if (diffDays <= 3) urgency = ` [DUE IN ${diffDays} DAYS]`;

      const course = a.course_name ? ` (${a.course_name})` : "";
      return `- ${a.name}${course} — due ${dueStr}${urgency}`;
    })
    .join("\n");
}
