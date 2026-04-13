import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Profile } from "../lib/types";

export default function Onboarding() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    net_id: "",
    major: "",
    class_year: "Freshman",
    goals: ""
  });

  useEffect(() => {
    async function checkProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth", { replace: true });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        navigate("/chat");
      } else {
        setLoading(false);
      }
    }
    checkProfile();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // For guest, just navigate to chat
      navigate("/chat");
      return;
    }

    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      ...formData,
      created_at: new Date().toISOString()
    });

    if (error) {
      alert("Error saving profile: " + error.message);
      setSaving(false);
    } else {
      navigate("/chat");
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-2xl border border-white/5">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white">Profile Setup</h2>
          <p className="mt-2 text-gray-400">Tell CyGuide a bit about yourself</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Full Name</label>
            <input
              required
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-isu-cardinal/50 transition-all"
              placeholder="Cy the Cardinal"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">NetID</label>
            <input
              required
              type="text"
              value={formData.net_id}
              onChange={(e) => setFormData({ ...formData, net_id: e.target.value })}
              className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-isu-cardinal/50 transition-all"
              placeholder="cycardinal"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Major</label>
            <input
              required
              type="text"
              value={formData.major}
              onChange={(e) => setFormData({ ...formData, major: e.target.value })}
              className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-isu-cardinal/50 transition-all"
              placeholder="Computer Science"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Class Year</label>
            <select
              value={formData.class_year}
              onChange={(e) => setFormData({ ...formData, class_year: e.target.value })}
              className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-isu-cardinal/50 transition-all"
            >
              <option>Freshman</option>
              <option>Sophomore</option>
              <option>Junior</option>
              <option>Senior</option>
              <option>Graduate</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Academic Goals (Optional)</label>
            <textarea
              value={formData.goals}
              onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
              className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-isu-cardinal/50 transition-all h-24 resize-none"
              placeholder="What do you want to achieve at ISU?"
            />
          </div>

          <button
            disabled={saving}
            type="submit"
            className="w-full bg-isu-cardinal hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-all duration-200 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Let's Go"}
          </button>
        </form>
      </div>
    </div>
  );
}
