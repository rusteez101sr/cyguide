import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase-server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface SerperResult {
  title: string;
  snippet: string;
  link: string;
  displayLink?: string;
  date?: string;
}

async function serperSearch(query: string, num = 10): Promise<SerperResult[]> {
  const key = process.env.SERPER_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": key, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num, gl: "us" }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.organic ?? []) as SerperResult[];
  } catch {
    return [];
  }
}

// ─── Find Sources ─────────────────────────────────────────────────────────────

async function findSources(
  topic: string,
  citationStyle: string,
  courseName: string,
  courseCode: string,
  studentMajor: string,
) {
  // Two targeted searches for academic depth
  const [r1, r2] = await Promise.all([
    serperSearch(`"${topic}" peer reviewed journal academic research site:edu OR site:gov OR site:org`, 8),
    serperSearch(`"${topic}" academic study ${courseCode || courseName || studentMajor}`, 6),
  ]);

  // Dedupe by link
  const seen = new Set<string>();
  const results: SerperResult[] = [];
  for (const r of [...r1, ...r2]) {
    if (!seen.has(r.link)) {
      seen.add(r.link);
      results.push(r);
    }
  }

  const searchContext = results
    .slice(0, 12)
    .map((r, i) =>
      `[${i + 1}] Title: ${r.title}\nURL: ${r.link}\nSnippet: ${r.snippet}${r.date ? `\nDate: ${r.date}` : ""}`,
    )
    .join("\n\n");

  const systemPrompt = `You are a research librarian helping an ISU student find credible academic sources.
Return ONLY a valid JSON array — no markdown, no preamble, no trailing text.
Each item must match this exact shape:
{
  "title": string,
  "authors": string,
  "year": string,
  "publisher_or_journal": string,
  "url": string,
  "relevance": string (2 sentences on why this source matters for the topic),
  "citation": string (fully formatted in ${citationStyle})
}
Prioritize: peer-reviewed journals, .edu / .gov sources, academic publishers.
Avoid: blogs, Wikipedia, opinion pieces, low-quality websites.
If a search result is not a credible academic source, skip it.
Return 5–8 sources.`;

  const userPrompt = `Student course: ${courseCode ? `${courseCode} — ` : ""}${courseName || "General"}
Citation style required: ${citationStyle}
Research topic: ${topic}

Search results to evaluate and format:
${searchContext}

Return the JSON array of credible sources with full ${citationStyle} citations.`;

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";

  // Strip any accidental markdown code fences
  const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to extract JSON array if Claude added any surrounding text
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Could not parse sources from Claude response");
  }
}

// ─── Check Bibliography ───────────────────────────────────────────────────────

async function checkBibliography(bibliography: string, citationStyle: string) {
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: `You are an academic writing tutor specializing in citation formatting.
Analyze a student's bibliography and return clear, actionable feedback.
Format your response with these sections:
1. **Overall Assessment** — 1-2 sentences on overall quality
2. **Issues Found** — numbered list, each with: the problematic entry (quoted), what's wrong, and the corrected version
3. **What's Correct** — brief note on entries that are properly formatted
Keep feedback constructive and specific. If no issues found, say so clearly.`,
    messages: [
      {
        role: "user",
        content: `Citation style: ${citationStyle}\n\nBibliography to check:\n\n${bibliography}`,
      },
    ],
  });

  return msg.content[0].type === "text" ? msg.content[0].text : "";
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      mode,          // "find_sources" | "check_bibliography"
      topic,
      citationStyle = "APA",
      courseCode = "",
      courseName = "",
      bibliography,
    } = body as {
      mode: "find_sources" | "check_bibliography";
      topic?: string;
      citationStyle?: string;
      courseCode?: string;
      courseName?: string;
      bibliography?: string;
    };

    if (mode === "check_bibliography") {
      if (!bibliography?.trim()) {
        return NextResponse.json({ error: "Bibliography text is required." }, { status: 400 });
      }
      const feedback = await checkBibliography(bibliography, citationStyle);
      return NextResponse.json({ feedback });
    }

    // find_sources
    if (!topic?.trim()) {
      return NextResponse.json({ error: "Research topic is required." }, { status: 400 });
    }

    // Fetch student major for better search context
    const { data: student } = await supabase
      .from("students")
      .select("major")
      .eq("user_id", user.id)
      .single();

    const sources = await findSources(
      topic,
      citationStyle,
      courseName,
      courseCode,
      student?.major ?? "",
    );

    // Persist session
    await supabase.from("research_sessions").insert({
      user_id: user.id,
      course_code: courseCode || null,
      course_name: courseName || null,
      topic,
      citation_style: citationStyle,
      sources,
    });

    return NextResponse.json({ sources });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Research request failed";
    console.error("[/api/research]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
