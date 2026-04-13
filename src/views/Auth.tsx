import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Mail, ArrowLeft, KeyRound } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return;
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
      },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setStep("code");
  };

  const verifyCode = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const token = code.replace(/\s/g, "");
    if (!token) return;
    setLoading(true);
    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: "email",
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    navigate("/onboarding", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-2xl border border-white/5">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            {step === "email" ? (
              <Mail className="w-10 h-10 text-isu-gold" />
            ) : (
              <KeyRound className="w-10 h-10 text-isu-gold" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-white">
            {step === "email" ? "Sign in with email" : "Enter your code"}
          </h1>
          <p className="text-sm text-gray-400">
            {step === "email"
              ? "We will email you a one-time code to verify your address."
              : `We sent a code to ${email}. Enter it below to continue.`}
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {step === "email" ? (
          <form onSubmit={sendCode} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-isu-cardinal/50"
                placeholder="you@iastate.edu"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-isu-cardinal hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300">Verification code</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1 w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-white tracking-widest text-center text-lg focus:outline-none focus:ring-2 focus:ring-isu-cardinal/50"
                placeholder="000000"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-isu-cardinal hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? "Verifying…" : "Verify and continue"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                setError(null);
                setLoading(true);
                const { error: err } = await supabase.auth.signInWithOtp({
                  email: email.trim(),
                  options: { shouldCreateUser: true },
                });
                setLoading(false);
                if (err) setError(err.message);
              }}
              className="w-full text-sm text-gray-400 hover:text-white py-2"
            >
              Resend code
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-white py-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Use a different email
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500">
          <Link to="/" className="text-isu-gold hover:underline">
            Back to home
          </Link>
          {" · "}
          <Link to="/chat" className="hover:text-white">
            Preview as guest
          </Link>
        </p>
      </div>
    </div>
  );
}
