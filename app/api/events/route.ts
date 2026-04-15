import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

interface SerperResult {
  title: string;
  snippet: string;
  link: string;
}

type EventsCategory = "All" | "Career" | "Academic" | "Social" | "Other";

interface CampusEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  event_date: string;
  category: string;
  url: string;
}

const CATEGORY_QUERIES: Record<EventsCategory, string> = {
  All: "site:iastate.edu Iowa State University campus events student activities Ames",
  Career: "site:iastate.edu Iowa State University career fair networking internship events Ames",
  Academic: "site:iastate.edu Iowa State University lectures research symposium workshop events Ames",
  Social: "site:iastate.edu Iowa State University student life comedy concert celebration events Ames",
  Other: "site:iastate.edu Iowa State University athletics exhibit museums events Ames",
};

function decodeEntities(text: string): string {
  const named: Record<string, string> = {
    "&amp;": "&",
    "&quot;": "\"",
    "&#039;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
    "&ndash;": "-",
    "&mdash;": "-",
    "&lt;": "<",
    "&gt;": ">",
  };

  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&[a-z#0-9]+;/gi, (entity) => named[entity] ?? entity);
}

function stripTags(html: string | undefined): string {
  if (!html) return "";

  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  ).replace(/\s+/g, " ").trim();
}

function normalizeCategory(value: string | null | undefined): Exclude<EventsCategory, "All"> {
  const raw = (value ?? "").trim().toLowerCase();

  if (
    raw.includes("career") ||
    raw.includes("internship") ||
    raw.includes("network") ||
    raw.includes("conference") ||
    raw.includes("supply chain")
  ) {
    return "Career";
  }

  if (
    raw.includes("academic") ||
    raw.includes("research") ||
    raw.includes("lecture") ||
    raw.includes("symposium") ||
    raw.includes("workshop") ||
    raw.includes("study") ||
    raw.includes("exhibition")
  ) {
    return "Academic";
  }

  if (
    raw.includes("social") ||
    raw.includes("student life") ||
    raw.includes("comedy") ||
    raw.includes("music") ||
    raw.includes("concert") ||
    raw.includes("celebration") ||
    raw.includes("night") ||
    raw.includes("memorial union")
  ) {
    return "Social";
  }

  return "Other";
}

function inferCategoryFromText(text: string): Exclude<EventsCategory, "All"> {
  return normalizeCategory(text);
}

function matchesCategory(event: CampusEvent, category: EventsCategory): boolean {
  if (category === "All") return true;
  return event.category === category;
}

function sortEvents(events: CampusEvent[]): CampusEvent[] {
  const now = Date.now();

  return [...events].sort((a, b) => {
    const aTime = new Date(a.event_date).getTime();
    const bTime = new Date(b.event_date).getTime();
    const aUpcoming = Number.isFinite(aTime) && aTime >= now;
    const bUpcoming = Number.isFinite(bTime) && bTime >= now;

    if (aUpcoming !== bUpcoming) {
      return aUpcoming ? -1 : 1;
    }

    return aTime - bTime;
  });
}

function dedupeEvents(events: CampusEvent[]): CampusEvent[] {
  const seen = new Set<string>();

  return events.filter((event) => {
    const key = `${event.title.toLowerCase()}|${new Date(event.event_date).toISOString()}|${event.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractDateFromText(text: string): string | null {
  const match = text.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan\.?|Feb\.?|Mar\.?|Apr\.?|Jun\.?|Jul\.?|Aug\.?|Sept?\.?|Oct\.?|Nov\.?|Dec\.?)\s+\d{1,2}(?:,\s*\d{4})?/i
  );

  if (!match) return null;

  const raw = match[0].replace(/\.$/, "");
  const withYear = /\d{4}/.test(raw) ? raw : `${raw}, ${new Date().getFullYear()}`;
  const parsed = new Date(withYear);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString();
}

function parseOfficialCalendarHtml(html: string): CampusEvent[] {
  const parts = html.split('<div class="event-feed-item">').slice(1);

  return parts.map((part, index) => {
    const titleMatch = part.match(/<h3 class="event-feed-item__title">[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>\s*([\s\S]*?)\s*<span class="sr-only">/i);
    const datetimeMatch = part.match(/<time[^>]+datetime="([^"]+)"/i);
    const locationMatch = part.match(/<div class="event-feed-item__location">([\s\S]*?)<\/div>/i);
    const detailsMatch = part.match(/<div class="event-feed-item__content-blurb">([\s\S]*?)<\/div>/i);
    const sourceMatch = part.match(/title="Calendar Source"><\/i>\s*([^<]+)<\/div>/i);

    const title = stripTags(titleMatch?.[2]);
    const url = titleMatch?.[1] ?? "";
    const eventDate = datetimeMatch?.[1];

    if (!title || !url || !eventDate) {
      return null;
    }

    const description = stripTags(detailsMatch?.[1]);
    const location = stripTags(locationMatch?.[1]);
    const source = stripTags(sourceMatch?.[1]);
    const category = inferCategoryFromText(`${title} ${description} ${source} ${url}`);

    return {
      id: `isu-${index}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      title,
      description,
      location,
      event_date: new Date(eventDate).toISOString(),
      category,
      url,
    } satisfies CampusEvent;
  }).filter((event): event is CampusEvent => event !== null);
}

async function fetchOfficialISUEvents(): Promise<CampusEvent[]> {
  const now = new Date();
  const weekOffsets = [0, 7, 14];

  const pages = await Promise.all(
    weekOffsets.map(async (offset) => {
      const date = new Date(now);
      date.setDate(now.getDate() + offset);
      const dateParam = date.toISOString().slice(0, 10);
      const res = await fetch(`https://events.iastate.edu/?date=${dateParam}&display=week`, {
        next: { revalidate: 900 },
        headers: {
          "User-Agent": "CyGuide/1.0 (+https://events.iastate.edu/)",
        },
      });

      if (!res.ok) return [];
      const html = await res.text();
      return parseOfficialCalendarHtml(html);
    })
  );

  return dedupeEvents(pages.flat());
}

async function searchGoogleISUEvents(category: EventsCategory): Promise<CampusEvent[]> {
  const key = process.env.SERPER_API_KEY;
  if (!key) return [];

  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        q: CATEGORY_QUERIES[category],
        num: 8,
        gl: "us",
      }),
      next: { revalidate: 900 },
    });
    if (!res.ok) return [];

    const data = await res.json();
    const organic: SerperResult[] = data.organic ?? [];

    return organic
      .filter((result) => {
        try {
          const hostname = new URL(result.link).hostname;
          return hostname.endsWith("iastate.edu");
        } catch {
          return false;
        }
      })
      .map((result, index) => {
        const parsedDate = extractDateFromText(`${result.title} ${result.snippet}`);
        if (!parsedDate) return null;

        const inferredCategory = category === "All"
          ? inferCategoryFromText(`${result.title} ${result.snippet}`)
          : category;

        return {
          id: `google-${index}-${result.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          title: stripTags(result.title.replace(/\s*[-|]\s*Iowa State.*$/i, "").trim()),
          description: stripTags(result.snippet),
          location: "Iowa State University",
          event_date: parsedDate,
          category: inferredCategory,
          url: result.link,
        } satisfies CampusEvent;
      })
      .filter((event): event is CampusEvent => event !== null);
  } catch {
    return [];
  }
}

async function fetchFallbackDbEvents(category: EventsCategory): Promise<CampusEvent[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("campus_events")
      .select("*")
      .order("event_date");

    if (!data) return [];

    return (data as CampusEvent[])
      .map((event) => ({
        ...event,
        category: normalizeCategory(event.category),
      }))
      .filter((event) => matchesCategory(event, category));
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const category = (req.nextUrl.searchParams.get("category") ?? "All") as EventsCategory;

  try {
    const [officialEvents, googleEvents] = await Promise.all([
      fetchOfficialISUEvents(),
      searchGoogleISUEvents(category),
    ]);

    const liveEvents = dedupeEvents([
      ...officialEvents.filter((event) => matchesCategory(event, category)),
      ...googleEvents.filter((event) => matchesCategory(event, category)),
    ]);

    if (liveEvents.length > 0) {
      return NextResponse.json({ events: sortEvents(liveEvents), source: "live" });
    }

    const dbEvents = await fetchFallbackDbEvents(category);
    return NextResponse.json({ events: sortEvents(dbEvents), source: "db" });
  } catch {
    const dbEvents = await fetchFallbackDbEvents(category);
    return NextResponse.json({ events: sortEvents(dbEvents), source: "db" });
  }
}
