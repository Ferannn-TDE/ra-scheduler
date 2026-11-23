import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabase";
import CustomAlert from "../components/CustomAlert";
import { useAlert } from "../hooks/useAlert";
import { DAYS_OF_WEEK, isMorningShiftDay } from "../constants/schedule";

export default function Preferences() {
  const navigate = useNavigate();
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 1. POOL: The slots the user is actually capable of working (from Availability table)
  const [availablePool, setAvailablePool] = useState<
    { day: number; shift: string }[]
  >([]);

  // 2. CHOICES: The subset the user specifically WANTS (from Shift Preferences table)
  const [preferredSlots, setPreferredSlots] = useState<
    { day: number; shift: string }[]
  >([]);

  const { alertState, triggerAlert, closeAlert } = useAlert();

  useEffect(() => {
    document.title = "My Preferences | RA Scheduler";
  }, []);

  // Load Data on Startup
  useEffect(() => {
    async function loadData() {
      const raId = localStorage.getItem("raId");
      if (!raId) return;

      try {
        // A. Fetch Availability (The Constraints)
        const { data: availData, error: availError } = await supabase
          .from("availability")
          .select("day_of_week, shift_type")
          .eq("ra_id", raId)
          .eq("status", "available");

        if (availError) throw availError;

        if (availData) {
          setAvailablePool(
            availData.map((d) => ({ day: d.day_of_week, shift: d.shift_type })),
          );
        }

        // B. Fetch Existing Preferences (The Choices)
        const { data: prefData, error: prefError } = await supabase
          .from("shift_preferences")
          .select("day_of_week, shift_type")
          .eq("ra_id", raId);

        if (prefError) throw prefError;

        if (prefData) {
          setPreferredSlots(
            prefData.map((d) => ({ day: d.day_of_week, shift: d.shift_type })),
          );
        }
      } catch (error) {
        console.error(error);
        triggerAlert(
          "Error",
          "Could not load your data. Please check your connection.",
          "error",
        );
      } finally {
        setInitialLoading(false);
      }
    }
    loadData();
  }, [triggerAlert]);

  // --- LOGIC HELPERS ---
  const isAvailable = (day: number, shift: string) => {
    return availablePool.some((s) => s.day === day && s.shift === shift);
  };

  const isPreferred = (day: number, shift: string) => {
    return preferredSlots.some((s) => s.day === day && s.shift === shift);
  };

  const togglePreference = (dayIndex: number, shift: "morning" | "evening") => {
    // 1. Strict Rule: Can't prefer a shift if you aren't available
    if (!isAvailable(dayIndex, shift)) {
      triggerAlert(
        "Not Available",
        "You marked yourself as 'Busy' during this time in your Semester Routine. Update your availability first.",
        "error",
      );
      return;
    }

    // 2. Toggle Logic
    if (isPreferred(dayIndex, shift)) {
      setPreferredSlots((prev) =>
        prev.filter((s) => !(s.day === dayIndex && s.shift === shift)),
      );
    } else {
      setPreferredSlots((prev) => [...prev, { day: dayIndex, shift }]);
    }
  };

  async function savePreferences() {
    setSaving(true);
    const raId = localStorage.getItem("raId");
    if (!raId) return navigate("/");

    try {
      // 1. Clear old preferences
      await supabase.from("shift_preferences").delete().eq("ra_id", raId);

      // 2. Insert new preferences
      const updates = preferredSlots.map((slot) => ({
        ra_id: raId,
        day_of_week: slot.day,
        shift_type: slot.shift,
      }));

      if (updates.length > 0) {
        const { error } = await supabase
          .from("shift_preferences")
          .insert(updates);
        if (error) throw error;
      }

      triggerAlert(
        "Saved!",
        "Your shift preferences have been updated.",
        "success",
      );
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (error) {
      console.error(error);
      triggerAlert("Error", "Could not save preferences.", "error");
    } finally {
      setSaving(false);
    }
  }

  // Render a single cell
  const renderCell = (dayIndex: number, shift: "morning" | "evening") => {
    // Weekday Mornings don't exist
    if (shift === "morning" && !isMorningShiftDay(dayIndex)) {
      return (
        <div className="p-2 h-16 flex items-center justify-center bg-slate-50/60">
          <span className="text-xs text-slate-300 font-medium">N/A</span>
        </div>
      );
    }

    const available = isAvailable(dayIndex, shift);
    const preferred = isPreferred(dayIndex, shift);

    return (
      <div className={`p-2 h-16 transition-colors duration-150 ${!available ? "bg-slate-50/60" : "bg-white"}`}>
        <button
          onClick={() => togglePreference(dayIndex, shift)}
          disabled={!available}
          title={!available ? "Not available during this time" : preferred ? "Click to remove preference" : "Click to mark as preferred"}
          className={`w-full h-full rounded-xl font-bold text-xs transition-all duration-150 border-2 flex flex-col items-center justify-center gap-0.5
            ${
              !available
                ? "border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50"
                : preferred
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-[0.96]"
                  : "border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/50"
            }`}
        >
          {!available ? (
            <span className="text-[10px] tracking-wide">BUSY</span>
          ) : preferred ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="text-[10px] tracking-wide">WANT</span>
            </>
          ) : (
            <span className="text-[10px] tracking-wide">OK</span>
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/20 p-5 sm:p-8 font-sans">
      <CustomAlert
        isOpen={alertState.isOpen}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        onClose={closeAlert}
      />

      <div className="max-w-4xl mx-auto">
        <header className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Shift Preferences
            </h1>
            <p className="text-slate-500 text-sm mt-1 leading-relaxed">
              Mark shifts you <span className="font-bold text-indigo-600">WANT</span> to work — these influence the schedule generator.{" "}
              <span className="text-slate-400 text-xs">Busy slots can't be selected.</span>
            </p>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors shrink-0 mt-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Dashboard
          </button>
        </header>

        {/* Preference Grid */}
        <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-opacity duration-300 ${initialLoading ? "opacity-50 pointer-events-none" : ""}`}>
          {/* Header Row */}
          <div className="grid grid-cols-[100px_repeat(7,1fr)] border-b border-slate-100 bg-slate-50/80">
            <div className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center">
              Shift
            </div>
            {DAYS_OF_WEEK.map((day, i) => (
              <div
                key={day}
                className={`p-3 text-center text-xs font-bold uppercase tracking-wide ${
                  i === 0 || i === 6 ? "text-indigo-600" : "text-slate-600"
                }`}
              >
                {day.slice(0, 3)}
              </div>
            ))}
          </div>

          {/* Morning Row */}
          <div className="grid grid-cols-[100px_repeat(7,1fr)] border-b border-slate-100 divide-x divide-slate-50">
            <div className="p-4 flex flex-col justify-center border-r border-slate-100">
              <span className="text-sm font-semibold text-slate-700">Morning</span>
              <span className="text-xs text-slate-400 mt-0.5">10–5pm</span>
            </div>
            {DAYS_OF_WEEK.map((_, i) => (
              <div key={`m-${i}`}>{renderCell(i, "morning")}</div>
            ))}
          </div>

          {/* Evening Row */}
          <div className="grid grid-cols-[100px_repeat(7,1fr)] divide-x divide-slate-50">
            <div className="p-4 flex flex-col justify-center border-r border-slate-100">
              <span className="text-sm font-semibold text-slate-700">Evening</span>
              <span className="text-xs text-slate-400 mt-0.5">5–11pm</span>
            </div>
            {DAYS_OF_WEEK.map((_, i) => (
              <div key={`e-${i}`}>{renderCell(i, "evening")}</div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-5 mt-4 px-1">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-4 h-4 rounded-lg bg-indigo-600" />
            Want this shift
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-4 h-4 rounded-lg border-2 border-slate-200 bg-white" />
            Available (OK if assigned)
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-4 h-4 rounded-lg bg-slate-100 border border-slate-200" />
            Busy (from your routine)
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all duration-150"
          >
            Cancel
          </button>
          <button
            onClick={savePreferences}
            disabled={saving || initialLoading}
            className="bg-indigo-600 text-white px-7 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 active:scale-[0.97] transition-all duration-150 shadow-lg shadow-indigo-600/25 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Preferences"}
          </button>
        </div>
      </div>
    </div>
  );
}
