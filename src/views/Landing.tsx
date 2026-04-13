import { Link } from "react-router-dom";
import { Mail } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="text-center space-y-6 max-w-2xl">
        <div className="flex justify-center items-center space-x-2">
          <span className="text-6xl">🌪️</span>
          <h1 className="text-7xl font-bold tracking-tighter text-white">CyGuide</h1>
        </div>
        
        <p className="text-xl text-gray-400 font-medium">
          Your AI companion at Iowa State University
        </p>

        <div className="pt-8 flex flex-col items-center space-y-4">
          <Link
            to="/auth"
            className="group relative flex items-center justify-center space-x-3 bg-isu-cardinal hover:bg-red-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 shadow-lg shadow-isu-cardinal/20 w-full sm:w-auto"
          >
            <Mail className="w-5 h-5" />
            <span>Sign in with email</span>
          </Link>

          <Link
            to="/chat"
            className="text-gray-500 hover:text-white transition-colors text-sm font-medium"
          >
            Continue as guest (preview only)
          </Link>
        </div>

        <div className="pt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-6 rounded-2xl bg-card border border-white/5">
            <h3 className="text-isu-gold font-semibold mb-2">📚 Policies</h3>
            <p className="text-sm text-gray-400">Instant answers on ISU academic rules and deadlines.</p>
          </div>
          <div className="p-6 rounded-2xl bg-card border border-white/5">
            <h3 className="text-isu-gold font-semibold mb-2">🗓️ Planning</h3>
            <p className="text-sm text-gray-400">Map out your degree path and semester schedules.</p>
          </div>
          <div className="p-6 rounded-2xl bg-card border border-white/5">
            <h3 className="text-isu-gold font-semibold mb-2">🧠 Tutoring</h3>
            <p className="text-sm text-gray-400">Get help with homework and complex concepts.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
