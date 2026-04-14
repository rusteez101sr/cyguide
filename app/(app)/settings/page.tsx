"use client";

import { useState, useEffect, FormEvent } from "react";
import { createClient } from "@/lib/supabase";

interface StudentProfile {
  name: string;
  net_id: string;
  major: string;
  class_year: string;
  gpa: string;
  advisor_name: string;
  advisor_email: string;
  advisor_phone: string;
  advisor_office: string;
  on_campus: boolean;
  meal_plan: string;
  canvas_ical_url: string;
}

const YEAR_OPTIONS = ["Freshman", "Sophomore", "Junior", "Senior"];
const MEAL_PLANS = ["None", "Cyclone", "Cardinal", "Gold"];

const FIELD_CONFIGS: Array<{
  key: keyof StudentProfile;
  label: string;
  type: string;
  placeholder?: string;
  options?: string[];
}> = [
  { key: "name", label: "Full Name", type: "text", placeholder: "Jane Smith" },
  { key: "net_id", label: "Net ID", type: "text", placeholder: "jsmith1" },
  { key: "major", label: "Major", type: "text", placeholder: "Computer Science" },
  { key: "class_year", label: "Class Year", type: "select", options: YEAR_OPTIONS },
  { key: "gpa", label: "GPA", type: "text", placeholder: "3.75" },
  { key: "advisor_name", label: "Advisor Name", type: "text", placeholder: "Dr. Jane Doe" },
  { key: "advisor_email", label: "Advisor Email", type: "email", placeholder: "jdoe@iastate.edu" },
  { key: "advisor_phone", label: "Advisor Phone", type: "text", placeholder: "(515) 294-0000" },
  { key: "advisor_office", label: "Advisor Office", type: "text", placeholder: "1234 Coover Hall" },
  { key: "meal_plan", label: "Meal Plan", type: "select", options: MEAL_PLANS },
];

export default function SettingsPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<StudentProfile>({
    name: "", net_id: "", major: "", class_year: "", gpa: "",
    advisor_name: "", advisor_email: "", advisor_phone: "", advisor_office: "",
    on_campus: false, meal_plan: "None", canvas_ical_url: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/student");
        const data = await res.json();
        if (data.student) {
          setProfile({
            name: data.student.name ?? "",
            net_id: data.student.net_id ?? "",
            major: data.student.major ?? "",
            class_year: data.student.class_year ?? "",
            gpa: data.student.gpa ?? "",
            advisor_name: data.student.advisor_name ?? "",
            advisor_email: data.student.advisor_email ?? "",
            advisor_phone: data.student.advisor_phone ?? "",
            advisor_office: data.student.advisor_office ?? "",
            on_campus: data.student.on_campus ?? false,
            meal_plan: data.student.meal_plan ?? "None",
            canvas_ical_url: data.student.canvas_ical_url ?? "",
          });
        } else {
          // Fall back to legacy profiles table
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: legacyProfile } = await supabase
              .from("profiles")
              .select("canvas_ical_url, major, year")
              .eq("id", user.id)
              .single();
            if (legacyProfile) {
              setProfile((prev) => ({
                ...prev,
                canvas_ical_url: legacyProfile.canvas_ical_url ?? "",
                major: legacyProfile.major ?? "",
                class_year: legacyProfile.year ?? "",
              }));
            }
          }
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const res = await fetch("/api/student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          net_id: profile.net_id,
          major: profile.major,
          class_year: profile.class_year,
          gpa: profile.gpa,
          advisor_name: profile.advisor_name,
          advisor_email: profile.advisor_email,
          advisor_phone: profile.advisor_phone,
          advisor_office: profile.advisor_office,
          on_campus: profile.on_campus,
          meal_plan: profile.meal_plan,
          canvas_ical_url: profile.canvas_ical_url,
          onboarding_complete: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Save failed");
      }

      // Also update legacy profiles table for Canvas iCal compatibility
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").upsert({
          id: user.id,
          canvas_ical_url: profile.canvas_ical_url,
          major: profile.major,
          year: profile.class_year,
        });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 border-2 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: "#C8102E" }} />
      </div>
    );
  }

  function Field({ config }: { config: typeof FIELD_CONFIGS[0] }) {
    const value = profile[config.key];
    const strValue = typeof value === "boolean" ? "" : (value ?? "");

    if (config.type === "select") {
      return (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">{config.label}</label>
          <select
            value={strValue}
            onChange={(e) => setProfile({ ...profile, [config.key]: e.target.value })}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-colors"
          >
            <option value="">Select…</option>
            {config.options?.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      );
    }

    return (
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">{config.label}</label>
        <input
          type={config.type}
          value={strValue}
          onChange={(e) => setProfile({ ...profile, [config.key]: e.target.value })}
          placeholder={config.placeholder}
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-colors"
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 pb-24 md:pb-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your profile and Canvas integration.</p>
      </div>

      <form onSubmit={save} className="flex flex-col gap-6">
        {/* Student Profile */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Student Profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FIELD_CONFIGS.slice(0, 5).map((config) => (
              <Field key={config.key} config={config} />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <input
              type="checkbox"
              id="on_campus"
              checked={profile.on_campus}
              onChange={(e) => setProfile({ ...profile, on_campus: e.target.checked })}
              className="w-4 h-4 rounded accent-red-600"
            />
            <label htmlFor="on_campus" className="text-sm text-gray-700">Living on campus</label>
          </div>
        </div>

        {/* Advisor Info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Academic Advisor</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FIELD_CONFIGS.slice(5, 9).map((config) => (
              <Field key={config.key} config={config} />
            ))}
          </div>
        </div>

        {/* Dining */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Meal Plan</h2>
          <Field config={FIELD_CONFIGS[9]} />
        </div>

        {/* Canvas iCal */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Canvas Calendar</h2>
          <p className="text-xs text-gray-400 mb-4">
            To find your URL: Canvas → Calendar → Calendar Feed (bottom right).
          </p>
          <input
            type="url"
            value={profile.canvas_ical_url}
            onChange={(e) => setProfile({ ...profile, canvas_ical_url: e.target.value })}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-colors"
            placeholder="https://canvas.iastate.edu/feeds/calendars/user_xxxx.ics"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-xl text-white text-sm font-medium transition-opacity disabled:opacity-50 hover:opacity-90"
          style={{ backgroundColor: "#C8102E" }}
        >
          {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Settings"}
        </button>
      </form>
    </div>
  );
}
