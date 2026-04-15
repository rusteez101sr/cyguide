"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

interface StudentSettingsProfile {
  name: string;
  net_id: string;
  class_year: string;
  on_campus: boolean;
  canvas_ical_url: string;
}

const YEAR_OPTIONS = ["Freshman", "Sophomore", "Junior", "Senior"];

const FIELD_CONFIGS: Array<{
  key: keyof StudentSettingsProfile;
  label: string;
  type: string;
  placeholder?: string;
  options?: string[];
}> = [
  { key: "name", label: "Full Name", type: "text", placeholder: "Jane Smith" },
  { key: "net_id", label: "Net ID", type: "text", placeholder: "jsmith1" },
  { key: "class_year", label: "Class Year", type: "select", options: YEAR_OPTIONS },
];

interface FieldProps {
  config: typeof FIELD_CONFIGS[number];
  profile: StudentSettingsProfile;
  onChange: (key: keyof StudentSettingsProfile, value: string) => void;
}

function Field({ config, profile, onChange }: FieldProps) {
  const value = profile[config.key];
  const strValue = typeof value === "boolean" ? "" : (value ?? "");

  if (config.type === "select") {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">{config.label}</label>
        <select
          value={strValue}
          onChange={(e) => onChange(config.key, e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-colors"
        >
          <option value="">Select…</option>
          {config.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
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
        onChange={(e) => onChange(config.key, e.target.value)}
        placeholder={config.placeholder}
        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-colors"
      />
    </div>
  );
}

export default function SettingsPage() {
  const [supabase] = useState(() => createClient());
  const [profile, setProfile] = useState<StudentSettingsProfile>({
    name: "",
    net_id: "",
    class_year: "",
    on_campus: false,
    canvas_ical_url: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/student", { cache: "no-store" });
        const data = await res.json();

        if (data.student) {
          setProfile({
            name: data.student.name ?? "",
            net_id: data.student.net_id ?? "",
            class_year: data.student.class_year ?? "",
            on_campus: data.student.on_campus ?? false,
            canvas_ical_url: data.student.canvas_ical_url ?? "",
          });
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: legacyProfile } = await supabase
              .from("profiles")
              .select("canvas_ical_url, year")
              .eq("id", user.id)
              .single();

            if (legacyProfile) {
              setProfile((prev) => ({
                ...prev,
                canvas_ical_url: legacyProfile.canvas_ical_url ?? "",
                class_year: legacyProfile.year ?? "",
              }));
            }
          }
        }
      } catch {
        // keep defaults
      }

      setLoading(false);
    }

    load();
  }, [supabase]);

  function handleFieldChange(key: keyof StudentSettingsProfile, value: string) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");

    try {
      const res = await fetch("/api/student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          net_id: profile.net_id,
          class_year: profile.class_year,
          on_campus: profile.on_campus,
          canvas_ical_url: profile.canvas_ical_url,
          onboarding_complete: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Save failed");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").upsert({
          id: user.id,
          canvas_ical_url: profile.canvas_ical_url,
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

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 pb-24 md:pb-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account basics and Canvas integration.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Academic Planning Moved</h2>
            <p className="text-sm text-gray-500 mt-1">
              Advisor details, major, GPA, interests, internships, and research experience now live in Academic Planning.
            </p>
          </div>
          <Link
            href="/planning"
            className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#C8102E" }}
          >
            Open Planning
          </Link>
        </div>
      </div>

      <form onSubmit={save} className="flex flex-col gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Student Basics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FIELD_CONFIGS.map((config) => (
              <Field key={config.key} config={config} profile={profile} onChange={handleFieldChange} />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <input
              type="checkbox"
              id="on_campus"
              checked={profile.on_campus}
              onChange={(e) => setProfile((prev) => ({ ...prev, on_campus: e.target.checked }))}
              className="w-4 h-4 rounded accent-red-600"
            />
            <label htmlFor="on_campus" className="text-sm text-gray-700">Living on campus</label>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-1">Canvas Calendar</h2>
              <p className="text-xs text-gray-400">
                Canvas → Calendar → Calendar Feed. Paste that feed URL here to sync assignment due dates into Calendar.
              </p>
            </div>
            <span className={`shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full ${profile.canvas_ical_url ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {profile.canvas_ical_url ? "Connected" : "Not connected"}
            </span>
          </div>
          <input
            type="url"
            value={profile.canvas_ical_url}
            onChange={(e) => setProfile((prev) => ({ ...prev, canvas_ical_url: e.target.value }))}
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
