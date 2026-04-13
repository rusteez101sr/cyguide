"use client";

import { useState, FormEvent } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function sendOtp(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: undefined,
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setStep("otp");
    }
  }

  async function verifyOtp(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg mb-3"
            style={{ backgroundColor: "#C8102E" }}
          >
            Cy
          </div>
          <h1 className="text-xl font-semibold text-gray-900">CyGuide</h1>
          <p className="text-sm text-gray-500 mt-1">
            Iowa State University AI Assistant
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {step === "email" ? (
            <>
              <h2 className="text-base font-semibold text-gray-900 mb-1">
                Sign in or create account
              </h2>
              <p className="text-sm text-gray-500 mb-5">
                Enter your ISU email and we&apos;ll send a verification code.
              </p>
              <form onSubmit={sendOtp} className="flex flex-col gap-3">
                <input
                  type="email"
                  placeholder="you@iastate.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-colors"
                />
                {error && (
                  <p className="text-xs text-red-600">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-3 rounded-xl text-white text-sm font-medium transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: "#C8102E" }}
                >
                  {loading ? "Sending…" : "Send verification code"}
                </button>
              </form>
            </>
          ) : (
            <>
              <button
                onClick={() => { setStep("email"); setError(""); setOtp(""); }}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-4 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
                </svg>
                Back
              </button>
              <h2 className="text-base font-semibold text-gray-900 mb-1">
                Check your email
              </h2>
              <p className="text-sm text-gray-500 mb-5">
                We sent a 6-digit code to{" "}
                <span className="font-medium text-gray-700">{email}</span>
              </p>
              <form onSubmit={verifyOtp} className="flex flex-col gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-center tracking-[0.3em] font-mono focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-colors"
                />
                {error && (
                  <p className="text-xs text-red-600">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full py-3 rounded-xl text-white text-sm font-medium transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: "#C8102E" }}
                >
                  {loading ? "Verifying…" : "Verify & sign in"}
                </button>
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={loading}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Resend code
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
