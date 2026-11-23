import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import InputAvailability from "./pages/InputAvailability";
import UploadSchedule from "./pages/UploadSchedule";
import Preferences from "./pages/Preferences";
import AdminScheduler from "./pages/AdminScheduler";
import ScheduleView from "./pages/ScheduleView";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default App;
