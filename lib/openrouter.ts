const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

type Intent = "policy" | "planning" | "tutor";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface StudentProfile {
  major?: string;
  year?: string;
  gpa?: string;
  [key: string]: string | undefined;
}

interface OpenRouterResponse {
  reply: string;
  model: string;
  intent: Intent;
}

const MODEL_MAP: Record<Intent, string> = {
  policy: "anthropic/claude-opus-4-6",
  planning: "openai/gpt-4o",
  tutor: "google/gemini-pro",
};

const CLASSIFIER_SYSTEM_PROMPT = `You are an intent classifier for CyGuide, an AI assistant for Iowa State University students.

Classify the student's message into exactly one of these intents:
- "policy": Questions about university rules, academic policies, graduation requirements, financial aid, deadlines, or administrative procedures.
- "planning": Questions about course selection, degree planning, scheduling, career paths, or what classes to take.
- "tutor": Questions about understanding course material, homework help, concepts, or subject-matter tutoring.

Respond with ONLY the intent word: policy, planning, or tutor.`;

async function classifyIntent(
  message: string,
  apiKey: string
): Promise<Intent> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://cyguide.iastate.edu",
      "X-Title": "CyGuide",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: CLASSIFIER_SYSTEM_PROMPT },
        { role: "user", content: message },
      ],
      max_tokens: 10,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter classification failed: ${error}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content?.trim().toLowerCase() ?? "";

  if (raw === "policy" || raw === "planning" || raw === "tutor") {
    return raw;
  }

  // Default to tutor if classifier returns unexpected output
  return "tutor";
}

function buildSystemPrompt(intent: Intent, profile: StudentProfile): string {
  const profileContext = Object.entries(profile)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  const base = `You are CyGuide, an AI assistant for Iowa State University students.${
    profileContext ? ` Student profile: ${profileContext}.` : ""
  }`;

  switch (intent) {
    case "policy":
      return `${base} You specialize in ISU academic policies, rules, graduation requirements, financial aid, and administrative procedures. Be precise and cite specific ISU policies when possible.`;
    case "planning":
      return `${base} You specialize in academic planning, course selection, degree roadmaps, and career guidance tailored to ISU programs. Give structured, actionable advice.`;
    case "tutor":
      return `${base} You are a patient tutor helping students understand course material, concepts, and homework problems. Break down complex ideas into clear explanations.`;
  }
}

export async function chat(
  message: string,
  history: Message[],
  profile: StudentProfile = {}
): Promise<OpenRouterResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set");
  }

  const intent = await classifyIntent(message, apiKey);
  const model = MODEL_MAP[intent];
  const systemPrompt = buildSystemPrompt(intent, profile);

  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: message },
  ];

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://cyguide.iastate.edu",
      "X-Title": "CyGuide",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter chat failed (${model}): ${error}`);
  }

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content ?? "";

  return { reply, model, intent };
}
