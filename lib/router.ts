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
  courses?: CourseInfo[];
}

export interface CourseInfo {
  course_code: string;
  course_name: string;
  professor_name?: string;
  professor_email?: string;
  professor_office?: string;
  professor_office_hours?: string;
  grade?: string;
}

export interface ChatResponse {
  reply: string;
  model: string;
  intent: Intent;
  citations?: string[];
}

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

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
  if (profile.advisor_name) {
    const advisorParts = [profile.advisor_name];
    if (profile.advisor_email) advisorParts.push(profile.advisor_email);
    if (profile.advisor_office) advisorParts.push(profile.advisor_office);
    lines.push(`Advisor: ${advisorParts.join(", ")}`);
  }
  if (profile.courses && profile.courses.length > 0) {
    lines.push(`Enrolled Courses:`);
    for (const c of profile.courses) {
      const parts = [`  • ${c.course_code} — ${c.course_name}`];
      if (c.professor_name) parts.push(`Prof: ${c.professor_name}`);
      if (c.grade) parts.push(`Grade: ${c.grade}`);
      lines.push(parts.join(" | "));
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

    case "degree_planning":
      return `${base}

You specialize in academic planning and degree navigation for ISU students. You help with:
- Semester-by-semester course planning
- 4-year degree plan generation based on their major
- What-if scenarios (failing a course, switching majors, adding a minor)
- Course prerequisite chains and sequencing
- Career path alignment with coursework
- Load balancing (credits per semester)

Give structured, actionable advice. Use tables or lists when showing course sequences. Consider the student's current year and completed courses.${extraSection}`;

    case "professor_lookup":
      return `${base}

You help students find professor contact information. If course info is in the student's profile, use it. If not, provide what you know from ISU faculty directories.
Format contact cards clearly: Name, Email, Office, Office Hours.${extraSection}`;

    case "advisor_email":
      return `${base}

You draft professional, warm emails from students to their academic advisors or professors.

Email format rules:
- Subject line: concise and specific
- Salutation: "Dear [Name],"
- Body: 2-3 paragraphs — introduce the issue, provide context, make a specific ask
- Sign-off: "Best regards, [Student Name] | [Net ID] | [Major]"
- Tone: professional but approachable

After drafting, offer to: regenerate, make it more formal, or make it shorter.${extraSection}`;

    case "campus_events":
      return `${base}

You help students discover what's happening on ISU's campus. You know about:
- Career fairs, networking events, workshops
- Cultural celebrations and diversity events
- Sports games and intramurals
- Academic clubs (ACM, IEEE, etc.) and their meetings
- Speaker series and research symposia
- Student organization events

Be enthusiastic and specific. If relevant to their major, highlight that connection.${extraSection}`;

    case "dining":
      return `${base}

You help students navigate ISU's dining options. You know about:
- Conversations (MRC), Friley Windows, and UDCC dining halls
- Meal plan types: Cyclone, Cardinal, Gold
- Hours and locations
- Menu items and dietary accommodations

${profile.meal_plan && profile.meal_plan !== "None" ? `This student has the ${profile.meal_plan} meal plan.` : ""}${extraSection}`;

    case "general_isu":
      return `${base}

You answer general questions about Iowa State University including:
- Campus navigation and building locations
- ISU traditions (Veishea, Homecoming, VEISHEA, etc.)
- Student organizations and Greek life
- Research opportunities (REUs, faculty labs)
- Internship and co-op resources through the Career Center
- Health and counseling services
- Campus parking and transportation (CyRide)
- Library resources (Parks Library)${extraSection}`;

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
  const model = MODEL_MAP[intent];
  const systemPrompt = buildSystemPrompt(intent, profile, calendarContext, extraContext);

  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    ...history.slice(-20), // keep last 20 messages for context
    { role: "user", content: message },
  ];

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({
      model,
      messages,
      temperature: intent === "struggling" ? 0.8 : 0.7,
      max_tokens: intent === "degree_planning" || intent === "advisor_email" ? 2048 : 1024,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI request failed (${model}): ${err}`);
  }

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content ?? "";

  return { reply, model, intent };
}

// Standalone degree planner — always uses GPT-4o
export async function generateDegreePlan(profile: StudentProfile): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) throw new Error("OPENAI_API_KEY is not configured");

  const profileCtx = buildProfileContext(profile);
  const prompt = `Generate a detailed semester-by-semester 4-year academic plan for this ISU student.

${profileCtx}

Create a realistic plan that:
1. Completes all major requirements for their program
2. Includes general education requirements
3. Sequences prerequisites correctly
4. Balances credit load (12–18 credits per semester)
5. Leaves room for electives and minors

Format as a structured plan with each semester on its own section:
**[Year] — [Semester]** (X credits)
- COURSE_CODE: Course Name (X credits)

After the plan, add a "Key Notes" section with important considerations.`;

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
  return data.choices?.[0]?.message?.content ?? "";
}
