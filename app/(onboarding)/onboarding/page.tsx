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

type Step = "name" | "netid" | "major" | "year" | "advisor" | "courses" | "oncampus" | "mealplan" | "done";

interface BotMessage {
  from: "bot" | "user";
  text: string;
}

interface OnboardingData {
  name: string;
  net_id: string;
  major: string;
  class_year: string;
  advisor_name: string;
  advisor_email: string;
  advisor_phone: string;
  advisor_office: string;
  courses: string[];
  on_campus: boolean;
  meal_plan: string;
}

const STEP_SEQUENCE: Step[] = ["name", "netid", "major", "year", "advisor", "courses", "oncampus", "mealplan", "done"];

function getNextStep(current: Step): Step {
  const idx = STEP_SEQUENCE.indexOf(current);
  return STEP_SEQUENCE[idx + 1] ?? "done";
}

function getBotQuestion(step: Step, data: Partial<OnboardingData>): string {
  const firstName = data.name?.split(" ")[0];
  switch (step) {
    case "name": return "Hey! I'm CyGuide, your ISU AI companion. 👋\n\nLet's get you set up. What's your full name?";
    case "netid": return `Nice to meet you, ${firstName}! What's your ISU Net ID? (e.g. jsmith1)`;
    case "major": return `Got it! What's your major?`;
    case "year": return `What year are you? (Freshman, Sophomore, Junior, or Senior)`;
    case "advisor": return `Who is your academic advisor? (Just their name is fine — e.g. "Dr. Sarah Kim")`;
    case "courses": return `What courses are you enrolled in this semester? List the course codes separated by commas. (e.g. "COMS 311, MATH 267, E E 201")`;
    case "oncampus": return `Are you living on campus or off campus? (reply "on" or "off")`;
    case "mealplan": return `What meal plan do you have? (None, Cyclone, Cardinal, or Gold)`;
    case "done": return `You're all set, ${firstName}! Welcome to CyGuide 🎉\n\nI've saved your profile. You can always update it in Settings. Let's head to your dashboard!`;
    default: return "";
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [step, setStep] = useState<Step>("name");
  const [input, setInput] = useState("");
  const [data, setData] = useState<Partial<OnboardingData>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [majorSuggestions, setMajorSuggestions] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Show initial bot message
    setMessages([{ from: "bot", text: getBotQuestion("name", {}) }]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [step]);

  function handleMajorInput(val: string) {
    setInput(val);
    if (step === "major" && val.length > 1) {
      const filtered = ISU_MAJORS.filter((m) => m.toLowerCase().includes(val.toLowerCase())).slice(0, 5);
      setMajorSuggestions(filtered);
    } else {
      setMajorSuggestions([]);
    }
  }

  async function handleSubmit(value?: string) {
    const text = (value ?? input).trim();
    if (!text || loading) return;

    setError("");
    setMajorSuggestions([]);
    setMessages((prev) => [...prev, { from: "user", text }]);
    setInput("");
    setLoading(true);

    // Small delay to feel natural
    await new Promise((r) => setTimeout(r, 600));

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
            botReply = `That doesn't look like a Net ID. It should be letters followed by numbers (e.g. jsmith1). Try again?`;
            nextStep = "netid";
          } else {
            newData.net_id = text.toLowerCase();
            botReply = getBotQuestion("major", newData);
          }
          break;

        case "major": {
          const match = ISU_MAJORS.find((m) => m.toLowerCase() === text.toLowerCase());
          if (!match) {
            const close = ISU_MAJORS.filter((m) => m.toLowerCase().includes(text.toLowerCase())).slice(0, 3);
            if (close.length > 0) {
              botReply = `I didn't recognize that exact major. Did you mean one of these?\n${close.map((m) => `• ${m}`).join("\n")}\n\nType the exact name to continue.`;
            } else {
              botReply = `I don't have that major in my list. Try something like "Computer Science", "Mechanical Engineering", or "Business Administration".`;
            }
            nextStep = "major";
          } else {
            newData.major = match;
            botReply = `Got it — **${match}**! ` + getBotQuestion("year", newData);
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
            botReply = getBotQuestion("advisor", newData);
          }
          break;
        }

        case "advisor":
          newData.advisor_name = text;
          botReply = getBotQuestion("courses", newData);
          break;

        case "courses": {
          const codes = text.split(/[,;]+/).map((c) => c.trim()).filter(Boolean);
          newData.courses = codes;

          // Look up courses in the database
          try {
            const res = await fetch("/api/student/courses-lookup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ codes }),
            });
            const courseData = res.ok ? await res.json() : { found: [], notFound: codes };
            const found = courseData.found ?? [];
            const notFound = courseData.notFound ?? [];

            let courseMsg = "";
            if (found.length > 0) {
              courseMsg = `Found these courses:\n${found.map((c: { course_code: string; professor_name: string }) => `• ${c.course_code} — Prof. ${c.professor_name}`).join("\n")}`;
            }
            if (notFound.length > 0) {
              courseMsg += (courseMsg ? "\n" : "") + `Couldn't find: ${notFound.join(", ")} (I'll add them manually).`;
            }
            botReply = (courseMsg ? courseMsg + "\n\n" : "") + getBotQuestion("oncampus", newData);
          } catch {
            botReply = `Saved those courses! ` + getBotQuestion("oncampus", newData);
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
            botReply = `Please reply "on" (on campus) or "off" (off campus).`;
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

          // Save to database
          try {
            const res = await fetch("/api/student", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: newData.name,
                net_id: newData.net_id,
                major: newData.major,
                class_year: newData.class_year,
                advisor_name: newData.advisor_name,
                on_campus: newData.on_campus,
                meal_plan: newData.meal_plan,
                onboarding_complete: true,
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

          // Redirect after a moment
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: "#C8102E" }}>
          Cy
        </div>
        <div>
          <p className="font-semibold text-sm text-gray-900">CyGuide Setup</p>
          <p className="text-xs text-gray-500">Iowa State University</p>
        </div>
        <div className="ml-auto">
          <div className="flex gap-1">
            {STEP_SEQUENCE.slice(0, -1).map((s, i) => (
              <div
                key={s}
                className={`h-1.5 w-6 rounded-full transition-colors ${
                  STEP_SEQUENCE.indexOf(step) > i ? "bg-red-500" : STEP_SEQUENCE.indexOf(step) === i ? "bg-red-300" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-xl mx-auto flex flex-col gap-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"} gap-3`}>
              {msg.from === "bot" && (
                <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold mt-0.5" style={{ backgroundColor: "#C8102E" }}>
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
              <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: "#C8102E" }}>
                Cy
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input */}
      {!isDone && (
        <div className="bg-white border-t border-gray-100 px-4 py-4 shrink-0">
          <div className="max-w-xl mx-auto relative">
            {/* Major suggestions */}
            {majorSuggestions.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {majorSuggestions.map((m) => (
                  <button
                    key={m}
                    onClick={() => { setInput(m); setMajorSuggestions([]); inputRef.current?.focus(); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-800 hover:bg-red-50 transition-colors"
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
            {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => handleMajorInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                placeholder={
                  step === "major" ? "Type your major…" :
                  step === "year" ? "Freshman, Sophomore, Junior, or Senior" :
                  step === "oncampus" ? "on or off" :
                  step === "mealplan" ? "None, Cyclone, Cardinal, or Gold" :
                  "Type your answer…"
                }
                disabled={loading}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 disabled:opacity-50"
              />
              <button
                onClick={() => handleSubmit()}
                disabled={!input.trim() || loading}
                className="px-5 py-3 rounded-xl text-white text-sm font-medium disabled:opacity-40 transition-opacity"
                style={{ backgroundColor: "#C8102E" }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
