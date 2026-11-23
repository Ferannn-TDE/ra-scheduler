import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "../utils/supabase";

interface ProtectedRouteProps {
  adminOnly?: boolean;
}

export default function ProtectedRoute({ adminOnly = false }: ProtectedRouteProps) {
  const [status, setStatus] = useState<"loading" | "authorized" | "unauthorized">(
    "loading",
  );

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const raId = localStorage.getItem("raId");

      if (adminOnly) {
        // Admin routes require a Supabase session — a name-only RA session doesn't qualify
        setStatus(session ? "authorized" : "unauthorized");
      } else {
        // General protected routes allow either a Supabase session or an RA localStorage session
        setStatus(session || raId ? "authorized" : "unauthorized");
      }
    }
    checkAuth();
  }, [adminOnly]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50/40">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 shadow-lg shadow-indigo-600/30 animate-pulse" />
          <div className="w-8 h-1.5 bg-indigo-200 rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-indigo-500 rounded-full animate-[bounce_1s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    );
  }

  return status === "authorized" ? <Outlet /> : <Navigate to="/" replace />;
}
