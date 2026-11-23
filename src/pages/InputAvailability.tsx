import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabase";
import { parseScheduleImage } from "../utils/ocr";
import CustomAlert from "../components/CustomAlert";
import { useAlert } from "../hooks/useAlert";
import { DAYS_OF_WEEK, isMorningShiftDay } from "../constants/schedule";

export default function InputAvailability() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false); // For the scanner spinner
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for the selected shifts
  const [selectedSlots, setSelectedSlots] = useState<
    { day: number; shift: string }[]
  >([]);

  const { alertState, triggerAlert, closeAlert } = useAlert();

  useEffect(() => {
    document.title = "My Availability | RA Scheduler";
  }, []);

  // 1. Load existing routine on startup
  useEffect(() => {
    async function loadExisting() {
      const raId = localStorage.getItem("raId");
      if (!raId) return;

      const { data } = await supabase
        .from("availability")
        .select("day_of_week, shift_type")
        .eq("ra_id", raId);
      if (data) {
        const loaded = data.map((d) => ({
          day: d.day_of_week,
          shift: d.shift_type,
        }));
        setSelectedSlots(loaded);
      }
    }
    loadExisting();
  }, []);

  const toggleSlot = (dayIndex: number, shift: "morning" | "evening") => {
    const exists = selectedSlots.some(
      (s) => s.day === dayIndex && s.shift === shift,
    );
    if (exists) {
      setSelectedSlots((prev) =>
        prev.filter((s) => !(s.day === dayIndex && s.shift === shift)),
      );
    } else {
      setSelectedSlots((prev) => [...prev, { day: dayIndex, shift }]);
    }
  };

  const isSelected = (dayIndex: number, shift: string) => {
    return selectedSlots.some((s) => s.day === dayIndex && s.shift === shift);
  };

  // --- AUTO-SCANNER LOGIC ---
  async function handleAutoScan(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return;
    setProcessing(true);

    try {
      const file = e.target.files[0];
      const busyConflicts = await parseScheduleImage(file);

      // Sanity check for empty response
      if (!Array.isArray(busyConflicts)) {
        return;
      }

      // 1. Create the "Perfect Week" based on RA Rules
      const fullValidWeek: { day: number; shift: string }[] = [];

      for (let i = 0; i < 7; i++) {
        // RULE: Evenings exist every day
        fullValidWeek.push({ day: i, shift: "evening" });

        // RULE: Mornings ONLY exist on Sunday (0) and Saturday (6)
        if (isMorningShiftDay(i)) {
          fullValidWeek.push({ day: i, shift: "morning" });
        }
      }

      // 2. Subtract the conflicts found by AI
      const finalAvailability = fullValidWeek.filter((validSlot) => {
        const isBusy = busyConflicts.some(
          (busy: any) =>
            busy.day === validSlot.day && busy.shift === validSlot.shift,
        );
        return !isBusy;
      });

      // 3. Update the Grid State
      setSelectedSlots(finalAvailability);

      // 4. Feedback Message (REPLACED ALERTS)
      if (busyConflicts.length > 0) {
        const conflictNames = busyConflicts
          .map((c: any) => `${DAYS_OF_WEEK[c.day]} ${c.shift}`)
          .join(", ");

        triggerAlert(
          "Schedule Scanned!",
          `We found conflicting classes during these shifts:\n${conflictNames}\n\nWe unchecked those automatically and marked everything else as AVAILABLE.`,
          "info",
        );
      } else {
        triggerAlert(
          "Success!",
          "No evening conflicts found in your schedule.\n\nWe marked all valid shifts as AVAILABLE.",
          "success",
        );
      }
    } catch (error: any) {
      console.error(error);

      if (error.message === "MISSING_TIME_COLUMN") {
        triggerAlert(
          "Scan Failed: Missing Time Column",
          "We could not see the time labels (9am, 5pm, etc.) on the left side of your screenshot.\n\nPlease take a wider screenshot that clearly shows the times on the left.",
          "error",
        );
      } else {
        triggerAlert(
          "Error",
          "Could not read schedule. Please try again or fill it out manually.",
          "error",
        );
      }
    } finally {
      setProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }
  // --------------------------

  async function saveTemplate() {
    setLoading(true);
    const raId = localStorage.getItem("raId");
    if (!raId) return navigate("/");

    try {
      // Clear old routine
      await supabase.from("availability").delete().eq("ra_id", raId);

      // Insert new routine
      const updates = selectedSlots.map((slot) => ({
        ra_id: raId,
        day_of_week: slot.day,
        shift_type: slot.shift,
        status: "available",
      }));

      if (updates.length > 0) {
        const { error } = await supabase.from("availability").insert(updates);
        if (error) throw error;
      }

      triggerAlert(
        "Saved!",
        "Your semester routine has been updated successfully.",
        "success",
      );
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (error) {
      console.error(error);
      triggerAlert(
        "Save Failed",
        "There was a problem saving your routine. Please try again.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }

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
        {/* Page Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              My Semester Routine
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Check every slot you're <span className="font-semibold text-emerald-600">available</span> to work.{" "}
              <span className="text-slate-400">Uncheck times you have class.</span>
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
        </div>

        {/* --- SCANNER CARD --- */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-indigo-600/20">
          <div>
            <h3 className="font-bold text-white text-sm">
              Have a screenshot of your classes?
            </h3>
            <p className="text-indigo-200 text-xs mt-0.5">
              Upload it and we'll auto-fill your conflicts.
            </p>
          </div>
          <div className="shrink-0">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAutoScan}
              className="hidden"
              accept="image/*"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={processing}
              className="bg-white/15 hover:bg-white/25 border border-white/20 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all duration-150 flex items-center gap-2 disabled:opacity-60 backdrop-blur-sm"
            >
              {processing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                  Scanning…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Scan Schedule
                </>
              )}
            </button>
          </div>
        </div>

        {/* --- SELECTION GRID --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Header Row */}
          <div className="grid grid-cols-[130px_repeat(7,1fr)] border-b border-slate-100 bg-slate-50/80">
            <div className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center">Shift</div>
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
          <div className="grid grid-cols-[130px_repeat(7,1fr)] border-b border-slate-100">
            <div className="p-4 flex flex-col justify-center border-r border-slate-100">
              <span className="text-sm font-semibold text-slate-700">Morning</span>
              <span className="text-xs text-slate-400 mt-0.5">10am – 5pm</span>
            </div>
            {DAYS_OF_WEEK.map((_, i) => (
              <div
                key={`m-${i}`}
                className={`p-2 flex items-center justify-center border-r border-slate-50 last:border-r-0 ${
                  !isMorningShiftDay(i) ? "bg-slate-50/60" : ""
                }`}
              >
                {isMorningShiftDay(i) ? (
                  <button
                    onClick={() => toggleSlot(i, "morning")}
                    className={`w-full h-12 rounded-xl font-bold text-sm transition-all duration-150 border-2
                      ${
                        isSelected(i, "morning")
                          ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/25 scale-[0.97]"
                          : "border-slate-200 text-slate-300 hover:border-indigo-300 hover:text-indigo-400 hover:bg-indigo-50/50"
                      }`}
                  >
                    {isSelected(i, "morning") ? (
                      <svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-slate-200">–</span>
                    )}
                  </button>
                ) : (
                  <span className="text-xs text-slate-300 font-medium">N/A</span>
                )}
              </div>
            ))}
          </div>

          {/* Evening Row */}
          <div className="grid grid-cols-[130px_repeat(7,1fr)]">
            <div className="p-4 flex flex-col justify-center border-r border-slate-100">
              <span className="text-sm font-semibold text-slate-700">Evening</span>
              <span className="text-xs text-slate-400 mt-0.5">5pm – 11pm</span>
            </div>
            {DAYS_OF_WEEK.map((_, i) => (
              <div key={`e-${i}`} className="p-2 flex items-center justify-center border-r border-slate-50 last:border-r-0">
                <button
                  onClick={() => toggleSlot(i, "evening")}
                  className={`w-full h-12 rounded-xl font-bold text-sm transition-all duration-150 border-2
                    ${
                      isSelected(i, "evening")
                        ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/25 scale-[0.97]"
                        : "border-slate-200 text-slate-300 hover:border-indigo-300 hover:text-indigo-400 hover:bg-indigo-50/50"
                    }`}
                >
                  {isSelected(i, "evening") ? (
                    <svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-slate-200">–</span>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 mt-4 px-1">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-4 h-4 rounded bg-emerald-500" />
            Available
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-4 h-4 rounded border-2 border-slate-200 bg-white" />
            Busy / Not available
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-4 h-4 rounded bg-slate-100" />
            N/A (no morning on weekdays)
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
            onClick={saveTemplate}
            disabled={loading}
            className="bg-indigo-600 text-white px-7 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 active:scale-[0.97] transition-all duration-150 shadow-lg shadow-indigo-600/25 disabled:opacity-60"
          >
            {loading ? "Saving…" : "Save Routine"}
          </button>
        </div>
      </div>
    </div>
  );
}
