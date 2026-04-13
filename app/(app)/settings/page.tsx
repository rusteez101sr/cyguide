"use client";

import { useState, useEffect, FormEvent } from "react";
import { createClient } from "@/lib/supabase";

interface Profile {
  canvas_token: string;
  canvas_url: string;
  major: string;
  year: string;
}

const YEAR_OPTIONS = ["Freshman", "Sophomore", "Junior", "Senior", "Graduate"];

export default function SettingsPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile>({
    canvas_token: "",
    canvas_url: "https://canvas.iastate.edu",
    major: "",
    year: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("canvas_token, canvas_url, major, year")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile({
          canvas_token: data.canvas_token ?? "",
          canvas_url: data.canvas_url ?? "https://canvas.iastate.edu",
          major: data.major ?? "",
          year: data.year ?? "",
        });
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      canvas_token: profile.canvas_token,
      canvas_url: profile.canvas_url || "https://canvas.iastate.edu",
      major: profile.major,
      year: profile.year,
    });

    setSaving(false);

    if (error) {
      setError(error.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
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
    <div className="max-w-xl mx-auto px-6 py-8 pb-24 md:pb-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Connect Canvas and set your profile for personalized responses.
        </p>
      </div>

      <form onSubmit={save} className="flex flex-col gap-6">
        {/* Canvas section */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Canvas Integration</h2>
          <p className="text-xs text-gray-400 mb-4">
            Get your API token from Canvas → Account → Settings → Approved Integrations → New Access Token.
          </p>

          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Canvas URL
              </label>
              <input
                type="url"
                value={profile.canvas_url}
                onChange={(e) => setProfile({ ...profile, canvas_url: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-colors"
                placeholder="https://canvas.iastate.edu"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Canvas API Token
              </label>
              <input
                type="password"
                value={profile.canvas_token}
                onChange={(e) => setProfile({ ...profile, canvas_token: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-colors font-mono"
                placeholder="Paste your token here"
              />
            </div>
          </div>
        </div>

        {/* Profile section */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Student Profile</h2>
          <p className="text-xs text-gray-400 mb-4">
            Used to personalize CyGuide&apos;s responses to your situation.
          </p>

          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Major
              </label>
              <input
                type="text"
                value={profile.major}
                onChange={(e) => setProfile({ ...profile, major: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-colors"
                placeholder="e.g. Computer Science"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Year
              </label>
              <select
                value={profile.year}
                onChange={(e) => setProfile({ ...profile, year: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-colors bg-white"
              >
                <option value="">Select year</option>
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-xl text-white text-sm font-medium transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ backgroundColor: "#C8102E" }}
        >
          {saving ? "Saving…" : saved ? "Saved!" : "Save settings"}
        </button>
      </form>
    </div>
  );
}
