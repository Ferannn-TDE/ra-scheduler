import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

// Each page is loaded on demand so the first visit only downloads what it needs.
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const InputAvailability = lazy(() => import("./pages/InputAvailability"));
const UploadSchedule = lazy(() => import("./pages/UploadSchedule"));
const Preferences = lazy(() => import("./pages/Preferences"));
const AdminScheduler = lazy(() => import("./pages/AdminScheduler"));
const ScheduleView = lazy(() => import("./pages/ScheduleView"));

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50/40">
      <div className="w-10 h-10 rounded-xl bg-indigo-600 shadow-lg shadow-indigo-600/30 animate-pulse" />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Login />} />

          {/* Protected routes — require any valid session (RA name or Admin) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/availability" element={<InputAvailability />} />
            <Route path="/preferences" element={<Preferences />} />
            <Route path="/upload" element={<UploadSchedule />} />
            <Route path="/schedule" element={<ScheduleView />} />
          </Route>

          {/* Admin-only routes — require a Supabase session */}
          <Route element={<ProtectedRoute adminOnly />}>
            <Route path="/admin/schedule" element={<AdminScheduler />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
