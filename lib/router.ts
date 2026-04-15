/**
 * CyGuide Intent Router
 * Classifies messages into 8 intents and routes to the correct AI model.
 * Uses OpenAI GPT-4o-mini for classification, then routes to GPT-4o or GPT-4o-mini
 * based on intent complexity. Falls back gracefully if Claude is unavailable.
 */

export type Intent =
  | "policy_qa"
  | "degree_planning"
  | "professor_lookup"
  | "advisor_email"
  | "campus_events"
  | "dining"
  | "general_isu"
  | "struggling";

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface StudentProfile {
  name?: string;
  net_id?: string;
  major?: string;
  class_year?: string;
  advisor_name?: string;
  advisor_email?: string;
  advisor_phone?: string;
  advisor_office?: string;
  on_campus?: boolean;
  meal_plan?: string;
  gpa?: string;
  interests?: string;
  internships?: string;
  research?: string;
  transcript_summary?: string;
  transcript_uploaded_at?: string;
  courses?: CourseInfo[];
}

export interface CourseInfo {
  course_code: string;
  course_name: string;
  professor_name?: string;
  professor_email?: string;
  professor_office?: string;
  professor_office_hours?: string;
  credits?: number;
  grade?: string;
  semester?: string;
  status?: "completed" | "current" | "next" | "planned" | "manual";
  source?: string;
}

export interface DegreePlanCourse {
  code: string;
  name: string;
  credits?: number | null;
  rationale?: string;
}

export interface DegreePlanSemester {
  title: string;
  status: "completed" | "current" | "next" | "planned";
  credits?: number | null;
  summary: string;
  courses: DegreePlanCourse[];
  milestones: string[];
}

export interface DegreePlanResult {
  overview: string;
  semesters: DegreePlanSemester[];
  notes: string[];
}

export interface ChatResponse {
  reply: string;
  model: string;
  intent: Intent;
  citations?: string[];
}

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

// ─── Web Search (Serper / Google) ────────────────────────────────────────────

/** Intents that should have live web search available */
const WEB_SEARCH_INTENTS: Set<Intent> = new Set([
  "campus_events",
  "dining",
  "general_isu",
  "policy_qa",
  "professor_lookup",
]);

const SEARCH_TOOL = {
  type: "function",
  function: {
    name: "search_web",
    description:
      "Search the web for real-time information: ISU campus events, dining hall menus, faculty contacts, academic policies, or any current Iowa State University news.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query — be specific (e.g. 'Iowa State University events April 2026' or 'Friley Windows dining menu today')",
        },
      },
      required: ["query"],
    },
  },
};

interface SerperResult {
  title: string;
  snippet: string;
  link: string;
}

async function searchWeb(query: string): Promise<string> {
  const key = process.env.SERPER_API_KEY;
  if (!key) return "Web search is unavailable (SERPER_API_KEY not configured).";

  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": key, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: 6, gl: "us" }),
    });
    if (!res.ok) return `Search failed (${res.status}).`;

    const data = await res.json();

    const organic: SerperResult[] = data.organic ?? [];
    const answerBox: string = data.answerBox?.answer ?? data.answerBox?.snippet ?? "";

    const lines: string[] = [];
    if (answerBox) lines.push(`FEATURED ANSWER: ${answerBox}\n`);

    organic.slice(0, 5).forEach((r, i) => {
      lines.push(`[${i + 1}] ${r.title}\n${r.snippet}\nURL: ${r.link}`);
    });

    return lines.join("\n\n") || "No results found.";
  } catch {
    return "Search request failed.";
  }
}

// Intent → model mapping
const MODEL_MAP: Record<Intent, string> = {
  policy_qa: "gpt-4o",
  degree_planning: "gpt-4o",
  professor_lookup: "gpt-4o-mini",
  advisor_email: "gpt-4o",
  campus_events: "gpt-4o-mini",
  dining: "gpt-4o-mini",
  general_isu: "gpt-4o-mini",
  struggling: "gpt-4o",
};

export const INTENT_META: Record<Intent, { label: string; color: string; description: string }> = {
  policy_qa: { label: "ISU Policy", color: "bg-amber-100 text-amber-800", description: "Academic policies & rules" },
  degree_planning: { label: "Degree Planning", color: "bg-blue-100 text-blue-800", description: "Course planning & degree maps" },
  professor_lookup: { label: "Professor Info", color: "bg-violet-100 text-violet-800", description: "Office hours & contact" },
  advisor_email: { label: "Email Draft", color: "bg-emerald-100 text-emerald-800", description: "Draft advisor/professor email" },
  campus_events: { label: "Campus Events", color: "bg-pink-100 text-pink-800", description: "What's happening on campus" },
  dining: { label: "Dining", color: "bg-orange-100 text-orange-800", description: "Dining halls & meal plans" },
  general_isu: { label: "ISU Info", color: "bg-gray-100 text-gray-700", description: "General ISU questions" },
  struggling: { label: "Support", color: "bg-red-100 text-red-800", description: "Academic & personal support" },
};

const CLASSIFIER_PROMPT = `You are an intent classifier for CyGuide, an AI assistant for Iowa State University (ISU) students.

Classify the student's message into EXACTLY ONE of these intents:
- "policy_qa": Questions about ISU rules, academic policies, graduation requirements, financial aid, deadlines, add/drop, housing, registration, academic integrity, GPA requirements, dean's list
- "degree_planning": Questions about course selection, 4-year plans, degree roadmaps, what-if scenarios (switching majors, failing a class), scheduling, prerequisite chains, career paths
- "professor_lookup": Questions asking for professor information, office hours, office location, or contact details for a specific professor or course
- "advisor_email": Requests to write, draft, or compose an email to an advisor or professor
- "campus_events": Questions about what's happening on campus, upcoming events, clubs, activities, career fairs
- "dining": Questions about dining hall menus, hours, meal plans, food options, dining hall locations
- "general_isu": General ISU questions about campus, student life, traditions, resources, Greek life, research, internships — not covered by other intents
- "struggling": Expressions of academic stress, failing, burnout, overwhelm, financial hardship, mental health struggles, or feeling like they don't belong

IMPORTANT: Return ONLY the intent string, nothing else. No explanation, no punctuation.`;

async function classifyIntent(message: string, apiKey: string): Promise<Intent> {
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: CLASSIFIER_PROMPT },
          { role: "user", content: message },
        ],
        max_tokens: 20,
        temperature: 0,
      }),
    });
    if (!response.ok) return "general_isu";
    const data = await response.json();
    const raw = (data.choices?.[0]?.message?.content ?? "").trim().toLowerCase() as Intent;
    const valid: Intent[] = ["policy_qa", "degree_planning", "professor_lookup", "advisor_email", "campus_events", "dining", "general_isu", "struggling"];
    return valid.includes(raw) ? raw : "general_isu";
  } catch {
    return "general_isu";
  }
}

function buildProfileContext(profile: StudentProfile): string {
  if (!profile || Object.keys(profile).length === 0) return "";

  const lines: string[] = [];
  if (profile.name) lines.push(`Name: ${profile.name}`);
  if (profile.net_id) lines.push(`Net ID: ${profile.net_id}`);
  if (profile.major) lines.push(`Major: ${profile.major}`);
  if (profile.class_year) lines.push(`Class Year: ${profile.class_year}`);
  if (profile.gpa) lines.push(`GPA: ${profile.gpa}`);
  if (profile.on_campus !== undefined) lines.push(`On Campus: ${profile.on_campus ? "Yes" : "No"}`);
  if (profile.meal_plan) lines.push(`Meal Plan: ${profile.meal_plan}`);
  if (profile.interests) lines.push(`Interests: ${profile.interests}`);
  if (profile.internships) lines.push(`Past Internships: ${profile.internships}`);
  if (profile.research) lines.push(`Past Research Experience: ${profile.research}`);
  if (profile.advisor_name) {
    const advisorParts = [profile.advisor_name];
    if (profile.advisor_email) advisorParts.push(profile.advisor_email);
    if (profile.advisor_office) advisorParts.push(profile.advisor_office);
    lines.push(`Advisor: ${advisorParts.join(", ")}`);
  }
  if (profile.transcript_summary) lines.push(`Transcript Summary: ${profile.transcript_summary}`);
  if (profile.courses && profile.courses.length > 0) {
    const completedCourses = profile.courses.filter((course) => {
      if (course.status) return course.status === "completed";
      return Boolean(course.grade);
    });
    const currentCourses = profile.courses.filter((course) => !completedCourses.includes(course));

    if (completedCourses.length > 0) {
      lines.push("Previously Completed Courses:");
      for (const c of completedCourses) {
        const parts = [`  • ${c.course_code} — ${c.course_name}`];
        if (c.semester) parts.push(`Semester: ${c.semester}`);
        if (c.grade) parts.push(`Grade: ${c.grade}`);
        if (c.credits) parts.push(`Credits: ${c.credits}`);
        lines.push(parts.join(" | "));
      }
    }

    if (currentCourses.length > 0) {
      lines.push("Current / Upcoming Courses:");
      for (const c of currentCourses) {
        const parts = [`  • ${c.course_code} — ${c.course_name}`];
        if (c.semester) parts.push(`Semester: ${c.semester}`);
        if (c.credits) parts.push(`Credits: ${c.credits}`);
        if (c.professor_name) parts.push(`Prof: ${c.professor_name}`);
        lines.push(parts.join(" | "));
      }
    }
  }
  return lines.join("\n");
}

function buildSystemPrompt(intent: Intent, profile: StudentProfile, calendarContext: string, extraContext: string): string {
  const profileContext = buildProfileContext(profile);

  const profileSection = profileContext
    ? `\n\nSTUDENT PROFILE:\n${profileContext}`
    : "";

  const calSection = calendarContext
    ? `\n\nSTUDENT'S UPCOMING CANVAS ASSIGNMENTS:\n${calendarContext}\n\nUse this list to answer questions about what assignments are due, what they need to work on, etc.`
    : "";

  const base = `You are CyGuide, an AI companion for Iowa State University (ISU) students. You are helpful, warm, and knowledgeable about ISU's campus, policies, and academic programs.${profileSection}${calSection}

${profileContext ? `Always address the student by their first name (${profile.name?.split(" ")[0] ?? "there"}). Personalize responses to their major and courses. Never ask for information already in their profile.` : ""}`;

  const extraSection = extraContext ? `\n\n${extraContext}` : "";

  switch (intent) {
    case "policy_qa":
      return `${base}

You specialize in ISU academic policies. You have deep knowledge of:
- Academic integrity policies and consequences
- Registration: add/drop deadlines, late fees, waitlist procedures
- Financial aid: FAFSA deadlines, scholarships, appeals process
- GPA requirements for colleges, dean's list, academic probation
- Graduation requirements and application deadlines
- Housing contracts and procedures
- ISU Spring 2026 Academic Calendar deadlines

Be precise. Cite specific ISU policies when possible. If uncertain, direct them to the Registrar, Dean of Students, or Financial Aid office.${extraSection}`;

    case "degree_planning": {
      const yearInfo = profile.class_year ? `They are a ${profile.class_year}.` : "";
      const gpaInfo = profile.gpa ? `Current GPA: ${profile.gpa}.` : "";
      const courseCount = profile.courses?.length ?? 0;
      return `${base}

You specialize in academic planning and degree navigation for ISU students. ${yearInfo} ${gpaInfo}

You help with:
- Semester-by-semester course planning tailored to their specific major (${profile.major || "their major"})
- 4-year degree plan generation based on ISU's actual curriculum
- What-if scenarios (failing a course, switching majors, adding a minor)
- Course prerequisite chains and sequencing
- Career path alignment with coursework
- Load balancing (12–18 credits per semester)

${courseCount > 0 ? `They are currently enrolled in ${courseCount} course(s) — factor those into planning.` : ""}

Give structured, specific advice using their actual major and year. Use formatted lists for course sequences. Never give generic advice — always reference their specific situation.${extraSection}`;
    }

    case "professor_lookup": {
      const profList = profile.courses && profile.courses.length > 0
        ? profile.courses
            .filter((c) => c.professor_name)
            .map((c) =>
              [
                `• ${c.course_code} (${c.course_name}): Prof. ${c.professor_name}`,
                c.professor_email ? `  Email: ${c.professor_email}` : "",
                c.professor_office ? `  Office: ${c.professor_office}` : "",
                c.professor_office_hours ? `  Hours: ${c.professor_office_hours}` : "",
              ]
                .filter(Boolean)
                .join("\n")
            )
            .join("\n")
        : null;

      return `${base}

You help students find professor contact information. Always use the actual data from the student's profile first — never invent contact details.

${profList ? `Known professors from their enrolled courses:\n${profList}\n\nPresent this data directly when asked. Do not say you "don't have access" if the info is listed above.` : "The student has not entered course info yet. Encourage them to add or upload courses in Academic Planning so you can provide accurate professor contacts."}

Format contact cards clearly with: Name, Email, Office, Office Hours.${extraSection}`;
    }

    case "advisor_email": {
      const recipientName = profile.advisor_name || "their advisor";
      const recipientEmail = profile.advisor_email ? ` (${profile.advisor_email})` : "";
      const sigName = profile.name || "[Your Name]";
      const sigNetId = profile.net_id ? ` | ${profile.net_id}` : "";
      const sigMajor = profile.major ? ` | ${profile.major}` : "";
      return `${base}

You draft professional, warm emails from students to their academic advisors or professors.

The student's advisor is ${recipientName}${recipientEmail}. Use their real name in the salutation.

Email format rules:
- Subject line: concise and specific (no placeholder brackets)
- Salutation: "Dear ${recipientName},"
- Body: 2-3 paragraphs — introduce the issue, provide context, make a specific ask
- Sign-off: "Best regards,\\n${sigName}${sigNetId}${sigMajor}"
- Tone: professional but approachable
- NEVER use placeholder text like [Name] or [Net ID] — use the actual values from the student profile

After drafting, offer to: regenerate, make it more formal, or make it shorter.${extraSection}`;
    }

    case "campus_events":
      return `${base}

You help students discover what's happening on ISU's campus. You have access to real-time web search — ALWAYS use search_web to find current, upcoming events before answering. Search for "Iowa State University campus events [current month year]" and related queries.

Cover:
- Career fairs, networking events, workshops
- Cultural celebrations and diversity events
- Sports games and intramurals
- Academic clubs (ACM, IEEE, etc.) and their meetings
- Speaker series and research symposia

Be specific: include event names, dates, times, and locations from your search results. If relevant to the student's major (${profile.major || "their field"}), highlight that connection.${extraSection}`;

    case "dining":
      return `${base}

You help students navigate ISU's dining options. You have real-time web search — use search_web to look up today's menus and current hours. Try queries like "Iowa State Friley Windows menu today" or "ISU dining hall hours".

ISU Dining halls:
- Conversations (MRC) — Memorial Union
- Friley Windows — Friley Hall
- UDCC — Union Drive Community Center

Meal plan types: Cyclone, Cardinal, Gold.
${profile.meal_plan && profile.meal_plan !== "None" ? `This student has the **${profile.meal_plan}** meal plan.` : ""}

Always check live data with search_web before listing menu items or hours.${extraSection}`;

    case "general_isu":
      return `${base}

You answer general questions about Iowa State University. Use search_web whenever you need current or specific information — hours, locations, recent news, resources, etc.

Topics:
- Campus navigation and building locations
- ISU traditions (Homecoming, etc.)
- Student organizations and Greek life
- Research opportunities (REUs, faculty labs)
- Career Center resources
- Health and counseling services (Student Counseling Services, Student Health)
- CyRide bus routes
- Parks Library resources

When facts might be outdated or location-specific, search first.${extraSection}`;

    case "struggling":
      return `${base}

A student has expressed stress, struggle, or distress. Your FIRST priority is empathy — never lead with resources or solutions.

Response structure:
1. Acknowledge their feelings warmly and specifically
2. Ask ONE follow-up question to understand better
3. THEN (if appropriate) gently surface relevant ISU resources:
   - Academic struggle: "Would it help to talk through your options? I can also draft an email to your advisor."
   - Mental health: Student Counseling Services — (515) 294-5056, 3515 Troxel Hall — counseling.iastate.edu
   - Financial hardship: Student Financial Aid — (515) 294-2223
   - Food insecurity: CyServ Food Pantry — 3625 Troxel Hall
   - Basic needs: Dean of Students — (515) 294-1020

Never be dismissive. Never dump a list of links. Always lead with humanity.${extraSection}`;
  }
}

export async function routeChat(
  message: string,
  history: Message[],
  profile: StudentProfile = {},
  calendarContext = "",
  extraContext = ""
): Promise<ChatResponse> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) throw new Error("OPENAI_API_KEY is not configured");

  const intent = await classifyIntent(message, openaiKey);
  // Upgrade web-search intents to gpt-4o so tool-calling works reliably
  const model = WEB_SEARCH_INTENTS.has(intent) ? "gpt-4o" : MODEL_MAP[intent];
  const systemPrompt = buildSystemPrompt(intent, profile, calendarContext, extraContext);
  const useSearch = WEB_SEARCH_INTENTS.has(intent);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chatMessages: any[] = [
    { role: "system", content: systemPrompt },
    ...history.slice(-20),
    { role: "user", content: message },
  ];

  const maxTokens = intent === "degree_planning" || intent === "advisor_email" ? 2048 : 1200;

  // First call — may return tool_calls if model wants to search
  const firstRes = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({
      model,
      messages: chatMessages,
      tools: useSearch ? [SEARCH_TOOL] : undefined,
      tool_choice: useSearch ? "auto" : undefined,
      temperature: intent === "struggling" ? 0.8 : 0.7,
      max_tokens: maxTokens,
    }),
  });

  if (!firstRes.ok) {
    const err = await firstRes.text();
    throw new Error(`AI request failed (${model}): ${err}`);
  }

  const firstData = await firstRes.json();
  const firstChoice = firstData.choices?.[0];

  // ── Handle tool calls (up to 2 search rounds) ────────────────────────────
  if (firstChoice?.finish_reason === "tool_calls" && firstChoice.message?.tool_calls?.length) {
    // Add assistant message with tool_calls to the thread
    chatMessages.push(firstChoice.message);

    // Execute each tool call (usually just one search)
    for (const toolCall of firstChoice.message.tool_calls) {
      if (toolCall.function?.name === "search_web") {
        let query = "";
        try {
          query = JSON.parse(toolCall.function.arguments).query ?? "";
        } catch {
          query = message;
        }
        const searchResult = await searchWeb(query);
        chatMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: searchResult,
        });
      }
    }

    // Second call — model now has search results, generates final answer
    const finalRes = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model,
        messages: chatMessages,
        temperature: intent === "struggling" ? 0.8 : 0.7,
        max_tokens: maxTokens,
      }),
    });

    if (!finalRes.ok) {
      const err = await finalRes.text();
      throw new Error(`AI follow-up failed (${model}): ${err}`);
    }

    const finalData = await finalRes.json();
    const reply = finalData.choices?.[0]?.message?.content ?? "";
    return { reply, model, intent };
  }

  // No tool call — use first response directly
  const reply = firstChoice?.message?.content ?? "";
  return { reply, model, intent };
}

function buildDegreePlanPrompt(profile: StudentProfile, profileCtx: string): string {
  return `Create a visual semester-by-semester academic plan for this Iowa State student.

${profileCtx}

Return ONLY valid JSON matching this exact schema:
{
  "overview": "2-4 sentence high-level summary",
  "semesters": [
    {
      "title": "Completed Coursework" | "Current Semester" | "Fall 2026" | "Spring 2027",
      "status": "completed" | "current" | "next" | "planned",
      "credits": number | null,
      "summary": "1-2 sentence summary for that block",
      "courses": [
        {
          "code": "COM S 227",
          "name": "Object-Oriented Programming",
          "credits": number | null,
          "rationale": "short reason this course belongs here"
        }
      ],
      "milestones": ["short milestone", "short milestone"]
    }
  ],
  "notes": ["short note", "short note", "short note"]
}

Rules:
- Use the student's transcript summary, previous coursework, current coursework, interests, past internships, and research experience.
- Do not recommend courses the student has already completed unless you are explicitly listing them in the completed/current sections.
- The first section should summarize completed coursework already on the transcript.
- The second section should summarize current or in-progress coursework.
- Then add the next recommended semesters in sequence.
- Keep course loads realistic for ISU, typically 12-18 credits.
- Use actual ISU-style course sequencing when possible, but do not invent exact catalog requirements if uncertain.
- Make the plan visually scannable: concise summaries, 3-6 courses per future semester, and practical milestones tied to the student's interests.
- If you do not know an exact course title, use a sensible placeholder like "Major elective" instead of fabricating a specific class.
- Notes should highlight advising checkpoints, transcript gaps, internship/research alignment, or risks.
`;
}

function cleanJsonResponse(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

// Standalone degree planner — always uses GPT-4o
export async function generateDegreePlan(profile: StudentProfile): Promise<DegreePlanResult> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) throw new Error("OPENAI_API_KEY is not configured");

  const profileCtx = buildProfileContext(profile);
  const prompt = buildDegreePlanPrompt(profile, profileCtx);

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are an expert academic advisor at Iowa State University with deep knowledge of all ISU degree requirements." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 3000,
    }),
  });

  if (!response.ok) throw new Error("Degree plan generation failed");
  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content ?? "";
  const cleaned = cleanJsonResponse(raw);

  try {
    const parsed = JSON.parse(cleaned) as DegreePlanResult;
    return {
      overview: parsed.overview ?? "",
      semesters: Array.isArray(parsed.semesters) ? parsed.semesters : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
    };
  } catch {
    throw new Error("Degree plan response could not be parsed");
  }
}
