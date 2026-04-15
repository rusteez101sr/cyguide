"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Course {
  id: string;
  course_code: string;
  course_name: string;
  professor_name?: string;
  professor_email?: string;
  professor_office?: string;
  professor_office_hours?: string;
  credits: number;
  grade?: string;
  semester: string;
}

interface Student {
  name: string;
  major: string;
  class_year: string;
  gpa?: string;
  advisor_name?: string;
  advisor_email?: string;
  advisor_office?: string;
  advisor_phone?: string;
  interests?: string;
  internships?: string;
  research?: string;
}

interface ResearchSource {
  title: string;
  authors: string;
  year: string;
  publisher_or_journal: string;
  url: string;
  relevance: string;
  citation: string;
}

interface QuestionnaireFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  helper?: string;
}

// ─── Sub-components (defined at module scope to avoid remount-on-render) ──────

function GradeChip({ grade }: { grade?: string }) {
  if (!grade) return <span className="text-xs text-gray-400">—</span>;
  const colors: Record<string, string> = {
    A: "bg-emerald-100 text-emerald-700",
    "A-": "bg-emerald-100 text-emerald-700",
    "B+": "bg-blue-100 text-blue-700",
    B: "bg-blue-100 text-blue-700",
    "B-": "bg-blue-100 text-blue-700",
    "C+": "bg-amber-100 text-amber-700",
    C: "bg-amber-100 text-amber-700",
    "C-": "bg-amber-100 text-amber-700",
    D: "bg-orange-100 text-orange-700",
    F: "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors[grade] ?? "bg-gray-100 text-gray-600"}`}>
      {grade}
    </span>
  );
}

function CourseCard({ course }: { course: Course }) {
  const [copied, setCopied] = useState(false);
  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">{course.course_code}</span>
            <span className="text-xs text-gray-400">{course.credits} cr</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">{course.course_name}</h3>
        </div>
        <GradeChip grade={course.grade} />
      </div>
      {course.professor_name && (
        <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-1 gap-2 text-xs text-gray-500">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-700">{course.professor_name}</span>
            {course.professor_email && (
              <button
                onClick={() => copy(course.professor_email!)}
                className="text-xs px-2 py-0.5 rounded-lg border border-gray-200 hover:border-red-200 hover:text-red-600 transition-colors"
              >
                {copied ? "Copied!" : "Copy email"}
              </button>
            )}
          </div>
          {course.professor_office && <span>📍 {course.professor_office}</span>}
          {course.professor_office_hours && <span>🕐 {course.professor_office_hours}</span>}
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <Link
          href={`/chat?q=Draft+an+email+to+my+professor+for+${course.course_code}`}
          className="text-xs px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#C8102E" }}
        >
          Draft email
        </Link>
        <Link
          href={`/chat?q=What+can+you+tell+me+about+${course.course_code}+${course.course_name}`}
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-red-200 hover:text-red-600 transition-colors"
        >
          Ask CyGuide
        </Link>
      </div>
    </div>
  );
}

function QuestionnaireInput({ label, value, onChange, placeholder, type = "text", helper }: QuestionnaireFieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-colors"
      />
      {helper && <p className="text-[11px] text-gray-400 mt-1.5">{helper}</p>}
    </div>
  );
}

function QuestionnaireTextarea({ label, value, onChange, placeholder, helper }: Omit<QuestionnaireFieldProps, "type">) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-colors resize-y min-h-[112px]"
      />
      {helper && <p className="text-[11px] text-gray-400 mt-1.5">{helper}</p>}
    </div>
  );
}

// ─── Spinner helper ───────────────────────────────────────────────────────────

function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlanningPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Degree plan tab
  const [degreePlan, setDegreePlan] = useState("");
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState("");

  // What-if tab
  const [whatIf, setWhatIf] = useState("");
  const [whatIfResult, setWhatIfResult] = useState("");
  const [whatIfLoading, setWhatIfLoading] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<"courses" | "plan" | "whatif" | "questionnaire" | "research">("courses");

  // Questionnaire tab
  const [profileForm, setProfileForm] = useState({
    advisor_name: "", advisor_email: "", advisor_phone: "", advisor_office: "",
    gpa: "", major: "", interests: "", internships: "", research: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Research tab
  const [researchMode, setResearchMode] = useState<"find" | "check">("find");
  const [researchTopic, setResearchTopic] = useState("");
  const [citationStyle, setCitationStyle] = useState("APA");
  const [researchCourseCode, setResearchCourseCode] = useState("");
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchError, setResearchError] = useState("");
  const [bibliography, setBibliography] = useState("");
  const [bibResult, setBibResult] = useState("");
  const [bibLoading, setBibLoading] = useState(false);
  const [bibError, setBibError] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/student", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setStudent(data.student);
        setCourses(data.courses ?? []);
        if (data.student) {
          setProfileForm({
            advisor_name: data.student.advisor_name ?? "",
            advisor_email: data.student.advisor_email ?? "",
            advisor_phone: data.student.advisor_phone ?? "",
            advisor_office: data.student.advisor_office ?? "",
            gpa: data.student.gpa ?? "",
            major: data.student.major ?? "",
            interests: data.student.interests ?? "",
            internships: data.student.internships ?? "",
            research: data.student.research ?? "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function generatePlan() {
    setPlanLoading(true);
    setPlanError("");
    try {
      const res = await fetch("/api/degree-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDegreePlan(data.plan);
      setActiveTab("plan");
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Failed to generate plan");
    } finally {
      setPlanLoading(false);
    }
  }

  async function runWhatIf() {
    if (!whatIf.trim()) return;
    setWhatIfLoading(true);
    try {
      const res = await fetch("/api/degree-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: whatIf }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWhatIfResult(data.plan);
    } catch (err) {
      setWhatIfResult(err instanceof Error ? err.message : "Failed");
    } finally {
      setWhatIfLoading(false);
    }
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError("");
    setProfileSaved(false);
    try {
      const res = await fetch("/api/student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profileForm, onboarding_complete: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Save failed");
      }
      setStudent((prev) => ({
        name: prev?.name ?? "",
        class_year: prev?.class_year ?? "",
        ...(prev ?? {}),
        ...profileForm,
      }));
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleFindSources(e: FormEvent) {
    e.preventDefault();
    if (!researchTopic.trim()) return;
    setResearchLoading(true);
    setResearchError("");
    setSources([]);
    try {
      const selectedCourse = courses.find((c) => c.course_code === researchCourseCode);
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "find_sources",
          topic: researchTopic,
          citationStyle,
          courseCode: researchCourseCode,
          courseName: selectedCourse?.course_name ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to find sources");
      setSources(data.sources ?? []);
    } catch (err) {
      setResearchError(err instanceof Error ? err.message : "Failed to find sources");
    } finally {
      setResearchLoading(false);
    }
  }

  async function handleCheckBibliography(e: FormEvent) {
    e.preventDefault();
    if (!bibliography.trim()) return;
    setBibLoading(true);
    setBibError("");
    setBibResult("");
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "check_bibliography", bibliography, citationStyle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to check bibliography");
      setBibResult(data.feedback ?? "");
    } catch (err) {
      setBibError(err instanceof Error ? err.message : "Failed to check bibliography");
    } finally {
      setBibLoading(false);
    }
  }

  function copyCitation(text: string, idx: number) {
    navigator.clipboard.writeText(text);
    setCopiedId(idx);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const totalCredits = courses.reduce((sum, c) => sum + (c.credits ?? 0), 0);
  const questionnaireCompletion = [
    profileForm.advisor_name, profileForm.gpa, profileForm.major,
    profileForm.interests, profileForm.internships, profileForm.research,
  ].filter((v) => v.trim()).length;

  const TAB_LABELS: Record<string, string> = {
    courses: "Courses", plan: "Degree Plan", whatif: "What-If",
    questionnaire: "Questionnaire", research: "Research",
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 pb-24 md:pb-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Academic Planning</h1>
        {student && (
          <p className="text-sm text-gray-500 mt-1">
            {student.major
              ? `${student.major} · ${student.class_year}`
              : student.class_year || "Build your plan profile"}
            {totalCredits > 0 ? ` · ${totalCredits} credits this semester` : ""}
          </p>
        )}
      </div>

      {/* Tab bar — scrollable so 5 tabs fit on mobile */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto">
        {(["courses", "plan", "whatif", "questionnaire", "research"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 text-xs font-medium py-2 px-3 rounded-lg transition-colors ${
              activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* ── Courses tab ───────────────────────────────────────────────────────── */}
      {activeTab === "courses" && (
        <div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 h-36 animate-pulse" />
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <p className="text-gray-500 text-sm mb-2">No current courses found for your profile yet.</p>
              <p className="text-xs text-gray-400">Fill out the Questionnaire tab and generate planning scenarios.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {courses.map((c) => <CourseCard key={c.id} course={c} />)}
              </div>
              <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs text-gray-400">Current GPA</p>
                  <p className="text-2xl font-semibold text-gray-900">{student?.gpa || "Add it in Questionnaire"}</p>
                </div>
                <button
                  onClick={generatePlan}
                  disabled={planLoading}
                  className="text-sm px-4 py-2 rounded-xl text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "#C8102E" }}
                >
                  {planLoading ? "Generating…" : "Generate Degree Plan →"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Degree Plan tab ───────────────────────────────────────────────────── */}
      {activeTab === "plan" && (
        <div>
          {!degreePlan && !planLoading && (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-gray-400">
                  <path d="M10.75 16.82A7.462 7.462 0 0115 15.5c.71 0 1.396.098 2.046.282A.75.75 0 0018 15.06v-11a.75.75 0 00-.546-.721A9.006 9.006 0 0015 3a8.963 8.963 0 00-4.25 1.065V16.82zM9.25 4.065A8.963 8.963 0 005 3c-.85 0-1.673.118-2.454.339A.75.75 0 002 4.06v11a.75.75 0 00.954.721A7.506 7.506 0 015 15.5c1.579 0 3.042.487 4.25 1.32V4.065z" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-gray-900 mb-2">Generate your 4-year plan</h2>
              <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto">
                CyGuide will create a personalized semester-by-semester plan based on your questionnaire and current progress.
              </p>
              {planError && <p className="text-sm text-red-500 mb-4">{planError}</p>}
              <button
                onClick={generatePlan}
                disabled={planLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "#C8102E" }}
              >
                {planLoading ? <><Spinner /> Generating with GPT-4o…</> : "Generate My Degree Plan"}
              </button>
            </div>
          )}
          {planLoading && (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <Spinner className="w-8 h-8 text-red-500 mx-auto mb-4" />
              <p className="text-sm text-gray-500">GPT-4o is generating your degree plan…</p>
            </div>
          )}
          {degreePlan && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">Your Degree Plan</h2>
                <button onClick={generatePlan} disabled={planLoading} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                  Regenerate
                </button>
              </div>
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">{degreePlan}</div>
              <div className="mt-4 pt-4 border-t border-gray-50 text-xs text-gray-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                Generated by GPT-4o · Always verify with your academic advisor
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── What-If tab ───────────────────────────────────────────────────────── */}
      {activeTab === "whatif" && (
        <div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Explore a scenario</h2>
            <p className="text-xs text-gray-500 mb-4">Ask CyGuide to analyze any change to your academic path.</p>
            <div className="flex flex-col gap-2 mb-4">
              {[
                "What if I fail COMS 311?",
                "What if I switch to Computer Engineering?",
                "What if I add a Data Science minor?",
                "What if I take 18 credits next semester?",
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setWhatIf(example)}
                  className="text-left text-xs px-3 py-2 rounded-lg border border-gray-200 hover:border-red-200 hover:bg-red-50 text-gray-600 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={whatIf}
                onChange={(e) => setWhatIf(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); runWhatIf(); } }}
                placeholder="What if I…"
                className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
              />
              <button
                onClick={runWhatIf}
                disabled={!whatIf.trim() || whatIfLoading}
                className="px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-40 transition-opacity"
                style={{ backgroundColor: "#C8102E" }}
              >
                {whatIfLoading ? "…" : "Analyze"}
              </button>
            </div>
          </div>
          {whatIfLoading && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
              <Spinner className="w-6 h-6 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Analyzing scenario…</p>
            </div>
          )}
          {whatIfResult && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-4">
                Scenario: &ldquo;{whatIf}&rdquo;
              </div>
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{whatIfResult}</div>
            </div>
          )}
        </div>
      )}

      {/* ── Questionnaire tab ─────────────────────────────────────────────────── */}
      {activeTab === "questionnaire" && (
        <form onSubmit={saveProfile} className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Planning Questionnaire</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Fill this out once and CyGuide will use it for planning, advisor support, and tailored career guidance.
                </p>
              </div>
              <div className="sm:w-52">
                <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1.5">
                  <span>Core fields completed</span>
                  <span>{questionnaireCompletion}/6</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(questionnaireCompletion / 6) * 100}%`, backgroundColor: "#C8102E" }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Advisor & academics</h3>
            <p className="text-xs text-gray-400 mb-4">Replaces the old advisor settings area — keeps your planning details in one place.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <QuestionnaireInput label="Academic advisor" value={profileForm.advisor_name}
                onChange={(v) => setProfileForm((p) => ({ ...p, advisor_name: v }))}
                placeholder="Dr. Jane Doe" helper="Required for advisor-focused planning help." />
              <QuestionnaireInput label="Advisor email" value={profileForm.advisor_email}
                onChange={(v) => setProfileForm((p) => ({ ...p, advisor_email: v }))}
                placeholder="jdoe@iastate.edu" type="email" helper="Lets CyGuide draft a ready-to-send email." />
              <QuestionnaireInput label="Advisor phone" value={profileForm.advisor_phone}
                onChange={(v) => setProfileForm((p) => ({ ...p, advisor_phone: v }))}
                placeholder="(515) 294-0000" />
              <QuestionnaireInput label="Advisor office" value={profileForm.advisor_office}
                onChange={(v) => setProfileForm((p) => ({ ...p, advisor_office: v }))}
                placeholder="1234 Coover Hall" />
              <QuestionnaireInput label="Major" value={profileForm.major}
                onChange={(v) => setProfileForm((p) => ({ ...p, major: v }))}
                placeholder="Computer Science" helper="Used for degree maps and requirement planning." />
              <QuestionnaireInput label="GPA" value={profileForm.gpa}
                onChange={(v) => setProfileForm((p) => ({ ...p, gpa: v }))}
                placeholder="3.75" helper="Used to calibrate degree plan and opportunity guidance." />
            </div>
            {(profileForm.advisor_name || profileForm.advisor_email) && (
              <div className="mt-4 pt-4 border-t border-gray-50">
                <Link
                  href="/chat?q=Draft+an+email+to+my+academic+advisor"
                  className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg text-white"
                  style={{ backgroundColor: "#C8102E" }}
                >
                  Draft email to advisor
                </Link>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Interests</h3>
            <p className="text-xs text-gray-400 mb-4">Tell CyGuide what you want more of so it can recommend better classes, orgs, internships, and labs.</p>
            <QuestionnaireTextarea label="Interests" value={profileForm.interests}
              onChange={(v) => setProfileForm((p) => ({ ...p, interests: v }))}
              placeholder="Example: machine learning, embedded systems, cybersecurity, product management, startups, sustainability."
              helper="List topics, industries, or kinds of work you want to explore." />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Experience</h3>
            <p className="text-xs text-gray-400 mb-4">Add prior experience so future recommendations can build on what you have already done.</p>
            <div className="grid grid-cols-1 gap-4">
              <QuestionnaireTextarea label="Past internships" value={profileForm.internships}
                onChange={(v) => setProfileForm((p) => ({ ...p, internships: v }))}
                placeholder="Example: Software Engineering Intern at Acme, Summer 2025. Built internal analytics dashboards."
                helper="Include company, role, term, and a short summary." />
              <QuestionnaireTextarea label="Past research experience" value={profileForm.research}
                onChange={(v) => setProfileForm((p) => ({ ...p, research: v }))}
                placeholder="Example: Undergraduate researcher in HCI lab. Ran usability studies and helped analyze interview transcripts."
                helper="Include faculty/lab, timeframe, and what you worked on." />
            </div>
          </div>

          {profileError && <p className="text-sm text-red-600">{profileError}</p>}
          <button
            type="submit"
            disabled={profileSaving}
            className="w-full py-3 rounded-xl text-white text-sm font-medium transition-opacity disabled:opacity-50 hover:opacity-90"
            style={{ backgroundColor: "#C8102E" }}
          >
            {profileSaving ? "Saving…" : profileSaved ? "✓ Saved!" : "Save Questionnaire"}
          </button>
        </form>
      )}

      {/* ── Research & Citations tab ──────────────────────────────────────────── */}
      {activeTab === "research" && (
        <div className="space-y-5">
          {/* Header card: mode switcher + citation style */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Research & Citations</h2>
                <p className="text-xs text-gray-400 mt-0.5">Find credible sources or check your bibliography</p>
              </div>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setResearchMode("find")}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                    researchMode === "find" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                  }`}
                >
                  Find Sources
                </button>
                <button
                  onClick={() => setResearchMode("check")}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                    researchMode === "check" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                  }`}
                >
                  Check Bibliography
                </button>
              </div>
            </div>

            {/* Citation style — shared */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 shrink-0">Citation style:</span>
              {["APA", "MLA", "Chicago", "IEEE"].map((style) => (
                <button
                  key={style}
                  onClick={() => setCitationStyle(style)}
                  className={`text-xs px-3 py-1 rounded-lg border font-medium transition-colors ${
                    citationStyle === style
                      ? "text-white border-transparent"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                  style={citationStyle === style ? { backgroundColor: "#C8102E" } : undefined}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Find Sources form */}
          {researchMode === "find" && (
            <form onSubmit={handleFindSources} className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Course <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <select
                    value={researchCourseCode}
                    onChange={(e) => setResearchCourseCode(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-colors"
                  >
                    <option value="">Select a course…</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.course_code}>
                        {c.course_code} — {c.course_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Research topic or thesis statement</label>
                  <textarea
                    value={researchTopic}
                    onChange={(e) => setResearchTopic(e.target.value)}
                    placeholder="e.g. The impact of social media on adolescent mental health, or paste your thesis statement…"
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-colors resize-none"
                  />
                </div>
                {researchError && <p className="text-sm text-red-600">{researchError}</p>}
                <button
                  type="submit"
                  disabled={!researchTopic.trim() || researchLoading}
                  className="w-full py-2.5 rounded-xl text-white text-sm font-medium transition-opacity disabled:opacity-40 hover:opacity-90 flex items-center justify-center gap-2"
                  style={{ backgroundColor: "#C8102E" }}
                >
                  {researchLoading ? <><Spinner /> Finding sources…</> : "Find Sources"}
                </button>
              </div>

              {/* Source cards */}
              {sources.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-400">{sources.length} sources · {citationStyle} format · powered by Claude</p>
                  {sources.map((src, idx) => (
                    <div key={idx} className="bg-white rounded-2xl border border-gray-100 p-5">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0 flex-1">
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-semibold text-gray-900 hover:text-red-600 transition-colors leading-snug line-clamp-2"
                          >
                            {src.title}
                          </a>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {src.authors} · {src.year}
                            {src.publisher_or_journal ? ` · ${src.publisher_or_journal}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">
                          {citationStyle}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed mb-3">{src.relevance}</p>
                      <div className="bg-gray-50 rounded-xl p-3 flex items-start justify-between gap-3">
                        <p className="text-xs text-gray-700 leading-relaxed font-mono flex-1 break-words">{src.citation}</p>
                        <button
                          type="button"
                          onClick={() => copyCitation(src.citation, idx)}
                          className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-red-200 hover:text-red-600 text-gray-500 transition-colors"
                        >
                          {copiedId === idx ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </form>
          )}

          {/* Check Bibliography form */}
          {researchMode === "check" && (
            <form onSubmit={handleCheckBibliography} className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Paste your bibliography</label>
                  <textarea
                    value={bibliography}
                    onChange={(e) => setBibliography(e.target.value)}
                    placeholder={"Paste your reference list here.\nExample:\nSmith, J. (2023). Title of article. Journal Name, 12(3), 45–67.\nDoe, A., & Lee, B. (2022). Another title. Publisher."}
                    rows={10}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-colors resize-y font-mono"
                  />
                </div>
                {bibError && <p className="text-sm text-red-600">{bibError}</p>}
                <button
                  type="submit"
                  disabled={!bibliography.trim() || bibLoading}
                  className="w-full py-2.5 rounded-xl text-white text-sm font-medium transition-opacity disabled:opacity-40 hover:opacity-90 flex items-center justify-center gap-2"
                  style={{ backgroundColor: "#C8102E" }}
                >
                  {bibLoading ? <><Spinner /> Checking…</> : "Check Bibliography"}
                </button>
              </div>

              {bibResult && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                    <p className="text-xs font-semibold text-gray-700">Review by Claude</p>
                    <span className="ml-auto text-xs text-gray-400">{citationStyle} format</span>
                  </div>
                  <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{bibResult}</div>
                </div>
              )}
            </form>
          )}
        </div>
      )}
    </div>
  );
}
