"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

const ISU_MAJORS = [
  "Accounting", "Aerospace Engineering", "Agricultural Business", "Agricultural Education",
  "Animal Science", "Architecture", "Biochemistry", "Biology", "Biomedical Engineering",
  "Business Administration", "Chemical Engineering", "Chemistry", "Civil Engineering",
  "Communication", "Computer Engineering", "Computer Science", "Construction Engineering",
  "Economics", "Electrical Engineering", "English", "Environmental Engineering",
  "Environmental Science", "Finance", "Food Science", "Genetics", "Graphic Design",
  "History", "Industrial Engineering", "Information Systems", "Journalism",
  "Kinesiology", "Management", "Marketing", "Materials Engineering",
  "Mathematics", "Mechanical Engineering", "Meteorology", "Microbiology",
  "Music", "Nutritional Science", "Philosophy", "Physics",
  "Political Science", "Psychology", "Software Engineering", "Statistics",
  "Supply Chain Management", "Sustainable Agriculture",
];

const CLASS_YEARS = ["Freshman", "Sophomore", "Junior", "Senior"];
const MEAL_PLANS = ["None", "Cyclone", "Cardinal", "Gold"];

type Step =
  | "name"
  | "netid"
  | "major"
  | "year"
  | "gpa"
  | "advisor"
  | "advisor_email"
  | "courses"
  | "oncampus"
  | "mealplan"
  | "done";

interface BotMessage {
  from: "bot" | "user";
  text: string;
}

interface OnboardingData {
  name: string;
  net_id: string;
  major: string;
  class_year: string;
  gpa: string;
  advisor_name: string;
  advisor_email: string;
  courses: string[];
  on_campus: boolean;
  meal_plan: string;
}

const STEP_SEQUENCE: Step[] = [
  "name", "netid", "major", "year", "gpa",
  "advisor", "advisor_email", "courses", "oncampus", "mealplan", "done",
];

function getNextStep(current: Step): Step {
  const idx = STEP_SEQUENCE.indexOf(current);
  return STEP_SEQUENCE[idx + 1] ?? "done";
}

/** Guess ISU email from advisor full name: "Dr. Sarah Kim" → "sarah.kim@iastate.edu" */
function guessAdvisorEmail(name: string): string {
  const cleaned = name.replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s*/i, "").trim();
  const parts = cleaned.split(/\s+/);
  if (parts.length >= 2) {
    const first = parts[0].toLowerCase().replace(/[^a-z]/g, "");
    const last = parts[parts.length - 1].toLowerCase().replace(/[^a-z]/g, "");
    return `${first}.${last}@iastate.edu`;
  }
  return "";
}

function getBotQuestion(step: Step, data: Partial<OnboardingData>): string {
  const firstName = data.name?.split(" ")[0];
  const guessed = data.advisor_name ? guessAdvisorEmail(data.advisor_name) : "";

  switch (step) {
    case "name":
      return "Hey! I'm CyGuide, your ISU AI companion.\n\nLet's get you set up in about 2 minutes. What's your full name?";
    case "netid":
      return `Nice to meet you, ${firstName}! What's your ISU Net ID? (e.g. jsmith1)`;
    case "major":
      return `Got it! What's your major?`;
    case "year":
      return `What year are you? (Freshman, Sophomore, Junior, or Senior)`;
    case "gpa":
      return `What's your current GPA? (e.g. 3.5 — type "skip" to continue)`;
    case "advisor":
      return `Who is your academic advisor? Just their name — e.g. "Dr. Sarah Kim".`;
    case "advisor_email":
      return guessed
        ? `Based on that, their ISU email is probably **${guessed}**.\n\nType "yes" to confirm, or enter the correct email if that's wrong.`
        : `What's your advisor's email? Check your ISU email for their signature. (Type "skip" if you don't know)`;
    case "courses":
      return `What courses are you in this semester? List course codes separated by commas.\n\n(e.g. "COMS 311, MATH 267, E E 201")`;
    case "oncampus":
      return `Are you living on campus or off campus? (reply "on" or "off")`;
    case "mealplan":
      return `What meal plan do you have? (None, Cyclone, Cardinal, or Gold)`;
    case "done":
      return `You're all set, ${firstName}! Welcome to CyGuide 🎉\n\nYour profile is saved — I'll use it to personalize every answer. Heading to your dashboard now!`;
    default:
      return "";
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [step, setStep] = useState<Step>("name");
  const [data, setData] = useState<Partial<OnboardingData>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [majorSuggestions, setMajorSuggestions] = useState<string[]>([]);
  // Uncontrolled: only drives button enabled state, does NOT control input value
  const [hasText, setHasText] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  // The ONE source of truth for the input element — uncontrolled
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMessages([{ from: "bot", text: getBotQuestion("name", {}) }]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // On step change: clear the input DOM value and focus
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = "";
      setHasText(false);
    }
    setMajorSuggestions([]);
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [step]);

  /** Called on every keystroke — only updates suggestion/button state, never the input value */
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setHasText(val.trim().length > 0);

    if (step === "major" && val.length > 1) {
      const filtered = ISU_MAJORS.filter((m) =>
        m.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 5);
      setMajorSuggestions(filtered);
    } else if (majorSuggestions.length > 0) {
      setMajorSuggestions([]);
    }
  }

  async function handleSubmit(presetValue?: string) {
    const text = (presetValue ?? inputRef.current?.value ?? "").trim();
    if (!text || loading) return;

    // Clear the input immediately
    if (inputRef.current) inputRef.current.value = "";
    setHasText(false);
    setMajorSuggestions([]);
    setError("");

    setMessages((prev) => [...prev, { from: "user", text }]);
    setLoading(true);

    await new Promise((r) => setTimeout(r, 500));

    let newData = { ...data };
    let nextStep = getNextStep(step);
    let botReply = "";

    try {
      switch (step) {
        case "name":
          if (text.split(" ").length < 2) {
            botReply = "Please enter your full name (first and last).";
            nextStep = "name";
          } else {
            newData.name = text;
            botReply = getBotQuestion("netid", newData);
          }
          break;

        case "netid":
          if (!/^[a-zA-Z]+\d*$/.test(text)) {
            botReply = `That doesn't look like a Net ID — should be letters then numbers (e.g. jsmith1). Try again?`;
            nextStep = "netid";
          } else {
            newData.net_id = text.toLowerCase();
            botReply = getBotQuestion("major", newData);
          }
          break;

        case "major": {
          const match = ISU_MAJORS.find((m) => m.toLowerCase() === text.toLowerCase());
          if (!match) {
            const close = ISU_MAJORS.filter((m) =>
              m.toLowerCase().includes(text.toLowerCase())
            ).slice(0, 3);
            botReply = close.length > 0
              ? `I didn't recognize that. Did you mean:\n${close.map((m) => `• ${m}`).join("\n")}\n\nType the exact name to continue.`
              : `I don't have that in my list. Try "Computer Science", "Mechanical Engineering", or "Business Administration".`;
            nextStep = "major";
          } else {
            newData.major = match;
            botReply = `Got it — **${match}**!\n\n` + getBotQuestion("year", newData);
          }
          break;
        }

        case "year": {
          const match = CLASS_YEARS.find((y) => y.toLowerCase() === text.toLowerCase());
          if (!match) {
            botReply = `Please reply with one of: Freshman, Sophomore, Junior, or Senior.`;
            nextStep = "year";
          } else {
            newData.class_year = match;
            botReply = getBotQuestion("gpa", newData);
          }
          break;
        }

        case "gpa": {
          if (text.toLowerCase() === "skip") {
            newData.gpa = "";
            botReply = getBotQuestion("advisor", newData);
          } else {
            const gpaNum = parseFloat(text);
            if (isNaN(gpaNum) || gpaNum < 0 || gpaNum > 4.0) {
              botReply = `Please enter a GPA between 0.0 and 4.0, or type "skip".`;
              nextStep = "gpa";
            } else {
              newData.gpa = text;
              botReply = getBotQuestion("advisor", newData);
            }
          }
          break;
        }

        case "advisor":
          newData.advisor_name = text;
          botReply = getBotQuestion("advisor_email", newData);
          break;

        case "advisor_email": {
          const guessed = newData.advisor_name ? guessAdvisorEmail(newData.advisor_name) : "";
          if (text.toLowerCase() === "skip") {
            newData.advisor_email = "";
          } else if (text.toLowerCase() === "yes" && guessed) {
            newData.advisor_email = guessed;
          } else if (text.includes("@")) {
            newData.advisor_email = text.toLowerCase();
          } else {
            botReply = `Enter a valid email (e.g. sarah.kim@iastate.edu), type "yes" to confirm ${guessed}, or type "skip".`;
            nextStep = "advisor_email";
            break;
          }
          botReply = newData.advisor_email
            ? `Got it — I'll use **${newData.advisor_email}** when drafting emails.\n\n` + getBotQuestion("courses", newData)
            : getBotQuestion("courses", newData);
          break;
        }

        case "courses": {
          const codes = text.split(/[,;]+/).map((c) => c.trim()).filter(Boolean);
          newData.courses = codes;

          try {
            const res = await fetch("/api/student/courses-lookup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ codes }),
            });
            const courseData = res.ok ? await res.json() : null;
            const found: Array<{ course_code: string; professor_name: string }> = courseData?.found ?? [];
            const notFound: string[] = courseData?.notFound ?? codes;
            let courseMsg = "";
            if (found.length > 0) {
              courseMsg = `Found in ISU catalog:\n${found.map((c) => `• ${c.course_code} — Prof. ${c.professor_name}`).join("\n")}`;
            }
            if (notFound.length > 0) {
              courseMsg += (courseMsg ? "\n" : "") + `Couldn't find: ${notFound.join(", ")} — added as-is.`;
            }
            botReply = (courseMsg ? courseMsg + "\n\n" : "") + getBotQuestion("oncampus", newData);
          } catch {
            botReply = `Saved ${codes.length} course${codes.length === 1 ? "" : "s"}!\n\n` + getBotQuestion("oncampus", newData);
          }
          break;
        }

        case "oncampus": {
          const lower = text.toLowerCase();
          if (lower.includes("on") || lower.includes("yes") || lower.includes("campus")) {
            newData.on_campus = true;
          } else if (lower.includes("off") || lower.includes("no")) {
            newData.on_campus = false;
          } else {
            botReply = `Reply "on" (on campus) or "off" (off campus).`;
            nextStep = "oncampus";
            break;
          }
          botReply = getBotQuestion("mealplan", newData);
          break;
        }

        case "mealplan": {
          const match = MEAL_PLANS.find((m) => m.toLowerCase() === text.toLowerCase());
          if (!match) {
            botReply = `Please reply with one of: None, Cyclone, Cardinal, or Gold.`;
            nextStep = "mealplan";
            break;
          }
          newData.meal_plan = match;

          try {
            const res = await fetch("/api/student", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: newData.name,
                net_id: newData.net_id,
                major: newData.major,
                class_year: newData.class_year,
                gpa: newData.gpa || null,
                advisor_name: newData.advisor_name,
                advisor_email: newData.advisor_email || null,
                on_campus: newData.on_campus,
                meal_plan: newData.meal_plan,
                onboarding_complete: true,
                courses: (newData.courses ?? []).map((code) => ({
                  course_code: code,
                  course_name: code,
                })),
              }),
            });
            if (!res.ok) throw new Error("Save failed");
          } catch {
            setError("Failed to save your profile. Please try again.");
            setLoading(false);
            return;
          }

          botReply = getBotQuestion("done", newData);
          nextStep = "done";
          setTimeout(() => router.replace("/dashboard"), 3000);
          break;
        }
      }
    } catch {
      botReply = "Something went wrong. Please try again.";
      nextStep = step;
    }

    setData(newData);
    setStep(nextStep);
    setMessages((prev) => [...prev, { from: "bot", text: botReply }]);
    setLoading(false);
  }

  const isDone = step === "done";
  const totalSteps = STEP_SEQUENCE.length - 1;
  const currentIdx = STEP_SEQUENCE.indexOf(step);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3 shrink-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
          style={{ backgroundColor: "#C8102E" }}
        >
          Cy
        </div>
        <div>
          <p className="font-semibold text-sm text-gray-900">CyGuide Setup</p>
          <p className="text-xs text-gray-500">Iowa State University</p>
        </div>
        <div className="ml-auto flex gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-5 rounded-full transition-colors ${
                currentIdx > i ? "bg-red-500" : currentIdx === i ? "bg-red-300" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-xl mx-auto flex flex-col gap-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"} gap-3`}
            >
              {msg.from === "bot" && (
                <div
                  className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold mt-0.5"
                  style={{ backgroundColor: "#C8102E" }}
                >
                  Cy
                </div>
              )}
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap max-w-[80%] ${
                  msg.from === "user"
                    ? "text-white rounded-br-sm"
                    : "bg-white border border-gray-100 text-gray-900 rounded-bl-sm shadow-sm"
                }`}
                style={msg.from === "user" ? { backgroundColor: "#C8102E" } : undefined}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div
                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: "#C8102E" }}
              >
                Cy
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input — always rendered in same DOM position, uncontrolled */}
      <div
        className="bg-white border-t border-gray-100 px-4 py-4 shrink-0"
        style={{ display: isDone ? "none" : undefined }}
      >
        <div className="max-w-xl mx-auto relative">
          {/* Major autocomplete — rendered above input */}
          {majorSuggestions.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10">
              {majorSuggestions.map((m) => (
                <button
                  key={m}
                  // onMouseDown fires before onBlur; preventDefault keeps focus on input
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (inputRef.current) inputRef.current.value = m;
                    setHasText(true);
                    setMajorSuggestions([]);
                    inputRef.current?.focus();
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-800 hover:bg-red-50 transition-colors"
                >
                  {m}
                </button>
              ))}
            </div>
          )}

          {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

          <div className="flex gap-2">
            {/*
              UNCONTROLLED input — no `value` prop.
              React never writes to this element during re-renders,
              so focus is never lost due to state updates.
            */}
            <input
              ref={inputRef}
              type="text"
              onChange={handleChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) handleSubmit();
              }}
              placeholder={
                step === "major" ? "Type your major…" :
                step === "year" ? "Freshman / Sophomore / Junior / Senior" :
                step === "gpa" ? "e.g. 3.5  —  or type skip" :
                step === "advisor_email" ? "yes  /  email@iastate.edu  /  skip" :
                step === "oncampus" ? "on  or  off" :
                step === "mealplan" ? "None / Cyclone / Cardinal / Gold" :
                "Type your answer…"
              }
              disabled={loading}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 disabled:opacity-50"
            />
            <button
              onMouseDown={(e) => {
                // Prevent button click from blurring the input
                e.preventDefault();
                handleSubmit();
              }}
              disabled={!hasText || loading}
              className="px-5 py-3 rounded-xl text-white text-sm font-medium disabled:opacity-40 transition-opacity"
              style={{ backgroundColor: "#C8102E" }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
