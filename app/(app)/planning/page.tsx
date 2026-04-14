"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";

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
}

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
          {course.professor_office && (
            <span>📍 {course.professor_office}</span>
          )}
          {course.professor_office_hours && (
            <span>🕐 {course.professor_office_hours}</span>
          )}
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

export default function PlanningPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [degreePlan, setDegreePlan] = useState("");
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState("");
  const [whatIf, setWhatIf] = useState("");
  const [whatIfResult, setWhatIfResult] = useState("");
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"courses" | "plan" | "whatif" | "advisor">("courses");

  useEffect(() => {
    fetch("/api/student")
      .then((r) => r.json())
      .then((data) => {
        setStudent(data.student);
        setCourses(data.courses ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  async function generatePlan() {
    setPlanLoading(true);
    setPlanError("");
    try {
      const res = await fetch("/api/degree-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
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

  const totalCredits = courses.reduce((sum, c) => sum + (c.credits ?? 0), 0);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 pb-24 md:pb-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Academic Planning</h1>
        {student && (
          <p className="text-sm text-gray-500 mt-1">{student.major} · {student.class_year} · {totalCredits} credits this semester</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {(["courses", "plan", "whatif", "advisor"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 text-xs font-medium py-2 rounded-lg transition-colors capitalize ${
              activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "whatif" ? "What-If" : tab === "plan" ? "Degree Plan" : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Current Courses Tab */}
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
              <p className="text-gray-500 text-sm mb-4">No courses found. Add your courses in Settings.</p>
              <Link href="/settings" className="text-sm text-white px-4 py-2 rounded-xl" style={{ backgroundColor: "#C8102E" }}>
                Go to Settings
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {courses.map((c) => <CourseCard key={c.id} course={c} />)}
              </div>
              {student?.gpa && (
                <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Current GPA</p>
                    <p className="text-2xl font-semibold text-gray-900">{student.gpa}</p>
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
              )}
            </>
          )}
        </div>
      )}

      {/* Degree Plan Tab */}
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
                CyGuide will create a personalized semester-by-semester plan based on your major and current progress.
              </p>
              {planError && <p className="text-sm text-red-500 mb-4">{planError}</p>}
              <button
                onClick={generatePlan}
                disabled={planLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "#C8102E" }}
              >
                {planLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generating with GPT-4o…
                  </>
                ) : "Generate My Degree Plan"}
              </button>
            </div>
          )}
          {planLoading && (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <div className="flex justify-center mb-4">
                <svg className="w-8 h-8 animate-spin text-red-500" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">GPT-4o is generating your degree plan…</p>
            </div>
          )}
          {degreePlan && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">Your Degree Plan</h2>
                <button
                  onClick={generatePlan}
                  disabled={planLoading}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Regenerate
                </button>
              </div>
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">
                {degreePlan}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-50 text-xs text-gray-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                Generated by GPT-4o · Always verify with your academic advisor
              </div>
            </div>
          )}
        </div>
      )}

      {/* What-If Tab */}
      {activeTab === "whatif" && (
        <div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Explore a scenario</h2>
            <p className="text-xs text-gray-500 mb-4">Ask CyGuide to analyze any "what if" for your academic path.</p>
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
                onKeyDown={(e) => { if (e.key === "Enter") runWhatIf(); }}
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
              <svg className="w-6 h-6 animate-spin text-red-500 mx-auto mb-2" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
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

      {/* Advisor Tab */}
      {activeTab === "advisor" && student && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Your Academic Advisor</h2>
            {student.advisor_name ? (
              <>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-lg font-semibold text-gray-500">
                    {student.advisor_name.split(" ").pop()?.[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{student.advisor_name}</p>
                    {student.advisor_office && <p className="text-xs text-gray-500">{student.advisor_office}</p>}
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  {student.advisor_email && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">{student.advisor_email}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(student.advisor_email!)}
                        className="text-xs px-2 py-1 rounded-lg border border-gray-200 hover:border-red-200 text-gray-500 hover:text-red-600 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  )}
                  {student.advisor_phone && (
                    <p className="text-gray-500">{student.advisor_phone}</p>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-50">
                  <Link
                    href="/chat?q=Draft+an+email+to+my+academic+advisor"
                    className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-xl text-white"
                    style={{ backgroundColor: "#C8102E" }}
                  >
                    Draft email to advisor
                  </Link>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">No advisor info saved. Add it in Settings.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
