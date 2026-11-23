import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabase";

export default function Dashboard() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Dashboard | RA Scheduler";
  }, []);

  useEffect(() => {
    async function checkUserStatus() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const raName = localStorage.getItem("raName");

      if (session) {
        setIsAdmin(true);
        const emailName = session.user.email?.split("@")[0] || "Admin";
        setName(emailName);
      } else if (raName) {
        setIsAdmin(false);
        setName(raName);
      }
      setLoading(false);
    }
    checkUserStatus();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    localStorage.clear();
    navigate("/");
  }

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50/40">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 shadow-lg shadow-indigo-600/30 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-5 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 bg-white/80 backdrop-blur-sm p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100 ring-1 ring-slate-50">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-600/25 shrink-0">
              {name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "RA"}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                {greeting}
              </p>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {name}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAdmin ? "Administrator" : "Resident Assistant"}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="px-3.5 py-2 text-xs font-semibold text-rose-600 bg-rose-50 rounded-xl hover:bg-rose-100 active:scale-95 transition-all duration-150 border border-rose-100"
          >
            Sign out
          </button>
        </div>

        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-1">
          {isAdmin ? "Admin tools" : "Quick actions"}
        </p>

        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isAdmin ? (
            /* --- ADMIN VIEW --- */
            <>
              <Link
                to="/admin/schedule"
                className="group relative h-full p-7 bg-slate-900 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col justify-center"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/50 to-slate-900" aria-hidden="true" />
                <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full -translate-y-10 translate-x-10 blur-xl" aria-hidden="true" />
                <div className="relative z-10">
                  <div className="w-11 h-11 bg-indigo-500/20 border border-indigo-400/30 rounded-xl flex items-center justify-center mb-4">
                    <svg className="w-5 h-5 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-white mb-1 tracking-tight">Admin Console</h2>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Generate schedules and manage the RA roster.
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-indigo-400 text-xs font-semibold">
                    Open console
                    <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>

              <Link
                to="/schedule"
                className="group h-full p-7 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-emerald-200 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-center"
              >
                <div className="w-11 h-11 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-1 tracking-tight">View Final Schedule</h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Check the finalized roster to see shifts.
                </p>
                <div className="mt-4 flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                  View roster
                  <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            </>
          ) : (
            /* --- RA VIEW --- */
            <>
              <Link
                to="/availability"
                className="group p-7 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-200 hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
              >
                <div className="w-11 h-11 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-1 tracking-tight">Enter Availability</h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Select the shifts you can work next week.
                </p>
                <div className="mt-auto pt-4 flex items-center gap-1 text-indigo-600 text-xs font-semibold">
                  Set availability
                  <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>

              <Link
                to="/preferences"
                className="group p-7 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-violet-200 hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
              >
                <div className="w-11 h-11 bg-violet-50 border border-violet-100 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-1 tracking-tight">My Preferences</h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Select specific shifts you really want.
                </p>
                <div className="mt-auto pt-4 flex items-center gap-1 text-violet-600 text-xs font-semibold">
                  Set preferences
                  <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>

              <Link
                to="/upload"
                className="group p-7 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-amber-200 hover:-translate-y-0.5 transition-all duration-200 flex flex-col md:col-span-2"
              >
                <div className="flex gap-5 items-start">
                  <div className="w-11 h-11 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-slate-900 mb-1 tracking-tight">Upload My Schedule</h2>
                    <p className="text-slate-500 text-sm leading-relaxed">
                      Upload a screenshot of your class schedule for automatic conflict detection.
                    </p>
                    <div className="mt-3 flex items-center gap-1 text-amber-600 text-xs font-semibold">
                      Upload screenshot
                      <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>

              <Link
                to="/schedule"
                className="group p-7 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-emerald-200 hover:-translate-y-0.5 transition-all duration-200 flex flex-col md:col-span-2"
              >
                <div className="flex gap-5 items-start">
                  <div className="w-11 h-11 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-slate-900 mb-1 tracking-tight">View Final Schedule</h2>
                    <p className="text-slate-500 text-sm leading-relaxed">
                      Check the finalized roster to see your assigned shifts.
                    </p>
                    <div className="mt-3 flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                      View roster
                      <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
