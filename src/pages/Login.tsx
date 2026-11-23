import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabase";
import CustomAlert from "../components/CustomAlert";

export default function Login() {
  const navigate = useNavigate();

  // Toggle State: Are we logging in as an Admin?
  const [isAdminMode, setIsAdminMode] = useState(false);

  // Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "info";
  }>({ isOpen: false, title: "", message: "", type: "error" });

  const triggerAlert = (title: string, message: string) => {
    setAlertState({ isOpen: true, title, message, type: "error" });
  };

  useEffect(() => {
    document.title = "RA Scheduler";
  }, []);

  // --- 1. EXISTING RA LOGIN (Name Only) ---
  async function handleRaLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    try {
      // Look up all RAs with this exact name (no .single() — avoids errors on 0 or 2+ rows)
      const { data: matches, error: lookupError } = await supabase
        .from("ras")
        .select("id, name")
        .eq("name", name.trim());

      if (lookupError) throw lookupError;

      // Guard against duplicate accounts — alert rather than silently picking one
      if (matches && matches.length > 1) {
        triggerAlert(
          "Duplicate Name Found",
          `Multiple accounts share the name "${name.trim()}". Please contact your admin to resolve this.`,
        );
        return;
      }

      let userId: string;

      if (matches && matches.length === 1) {
        // Existing RA — log in
        userId = matches[0].id;
      } else {
        // New RA — create account
        const { data: newUser, error: insertError } = await supabase
          .from("ras")
          .insert([{ name: name.trim() }])
          .select("id")
          .single();
        if (insertError) throw insertError;
        userId = newUser.id;
      }

      localStorage.setItem("raId", userId);
      localStorage.setItem("raName", name.trim());
      navigate("/dashboard");
    } catch (error) {
      console.error("RA Login Error:", error);
      triggerAlert("Login Failed", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // --- 2. NEW ADMIN LOGIN (Email & Password) ---
  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Real Supabase Auth
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      triggerAlert("Admin Login Failed", error.message);
    } else {
      navigate("/dashboard");
    }
    setLoading(false);
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-indigo-50/60 to-slate-100 font-sans p-4 overflow-hidden">
      {/* Decorative background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-48 -right-48 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-48 -left-48 w-96 h-96 bg-violet-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-64 bg-indigo-100/20 rounded-full blur-3xl" />
      </div>

      <CustomAlert
        isOpen={alertState.isOpen}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        onClose={() => setAlertState((prev) => ({ ...prev, isOpen: false }))}
      />

      <div className="relative w-full max-w-md">
        {/* Brand mark */}
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-xl font-bold text-slate-700 tracking-tight">RA Scheduler</span>
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl shadow-slate-300/30 border border-slate-100/80 overflow-hidden">
          {/* Segmented Toggle */}
          <div className="flex gap-1.5 p-2 bg-slate-50 border-b border-slate-100">
            <button
              onClick={() => setIsAdminMode(false)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
                !isAdminMode
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-100"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Student RA
            </button>
            <button
              onClick={() => setIsAdminMode(true)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
                isAdminMode
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-100"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Admin Access
            </button>
          </div>

          <div className="px-8 py-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight">
              {isAdminMode ? "Admin Console" : "Welcome back"}
            </h1>
            <p className="text-slate-500 text-sm mb-7 leading-relaxed">
              {isAdminMode
                ? "Secure login for schedule managers."
                : "Enter your name to access your schedule."}
            </p>

            {isAdminMode ? (
              /* --- ADMIN FORM --- */
              <form
                onSubmit={handleAdminLogin}
                className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300"
              >
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="admin@university.edu"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 focus:bg-white outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 focus:bg-white outline-none transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 shadow-lg shadow-indigo-600/25 mt-2"
                >
                  {loading ? "Verifying..." : "Enter Console"}
                </button>
              </form>
            ) : (
              /* --- RA FORM --- */
              <form
                onSubmit={handleRaLogin}
                className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-300"
              >
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 focus:bg-white outline-none transition-all"
                  />
                  <p className="text-xs text-slate-400 pl-1">
                    Enter your name exactly as your admin registered it.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 shadow-lg shadow-indigo-600/25"
                >
                  {loading ? "Loading..." : "Continue →"}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5">
          RA Scheduler · Built for residence life teams
        </p>
      </div>
    </div>
  );
}
