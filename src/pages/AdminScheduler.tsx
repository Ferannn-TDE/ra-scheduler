import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabase";
import { format, parseISO } from "date-fns";
import { generateSemesterSchedule, type Shift } from "../utils/scheduler";
import CustomAlert from "../components/CustomAlert";
import ConfirmModal from "../components/ConfirmModal";
import ShiftCard from "../components/ShiftCard";
import FairnessChart from "../components/FairnessChart";
import { useAlert } from "../hooks/useAlert";
import type { PublishLog, RA, ScheduleRow } from "../types";

// Default semester window shown when the page first loads.
const DEFAULT_START_DATE = "2026-01-17";
const DEFAULT_END_DATE = "2026-05-17";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function StatsModal({
  title,
  list,
  onClose,
}: {
  title: string;
  list: { name: string; count: number }[];
  onClose: () => void;
}) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); },
    [onClose],
  );
  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100">
          {list.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center px-5 py-3">
              <span className="text-slate-700">{item.name}</span>
              <span className="font-bold text-slate-800 tabular-nums">{item.count}</span>
            </div>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminScheduler() {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState(DEFAULT_START_DATE);
  const [endDate, setEndDate] = useState(DEFAULT_END_DATE);
  const [schedule, setSchedule] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [ras, setRas] = useState<RA[]>([]);
  const [publishLogs, setPublishLogs] = useState<PublishLog[]>([]);
  const [modalData, setModalData] = useState<{
    title: string;
    list: { name: string; count: number }[];
  } | null>(null);
  const { alertState, triggerAlert, closeAlert } = useAlert();

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
    confirmText: string;
    isDestructive: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: async () => {},
    confirmText: "Confirm",
    isDestructive: false,
  });

  useEffect(() => {
    document.title = "Admin Scheduler | RA Scheduler";
  }, []);

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase
      .from("publish_logs")
      .select("*")
      .order("published_at", { ascending: false });
    if (data) setPublishLogs(data as PublishLog[]);
  }, []);

  useEffect(() => {
    async function initAdmin() {
      // A. Fetch RAs
      const { data: raData } = await supabase.from("ras").select("id, name");
      if (raData) setRas(raData);

      // C. Fetch Logs
      fetchLogs();

      // D. FETCH EXISTING SCHEDULE & POPULATE UI
      // We look for any shifts that exist within the default window
      const { data: existingShifts } = await supabase
        .from("schedule")
        .select("*")
        .gte("date", DEFAULT_START_DATE)
        .lte("date", DEFAULT_END_DATE);

      if (existingShifts && existingShifts.length > 0) {
        // We need to group these raw DB rows into our 'Shift' object format
        // Raw: { date, shift_type, ra_id }
        // Target: { date, type, assignedRaIds: [] }

        const groupedMap = (existingShifts as ScheduleRow[]).reduce(
          (acc, row) => {
            const key = `${row.date}-${row.shift_type}`;
            if (!acc[key]) {
              acc[key] = {
                date: row.date,
                type: row.shift_type, // 'shift_type' from DB maps to 'type'
                assignedRaIds: [],
                isUnderstaffed: false,
              };
            }
            acc[key].assignedRaIds.push(row.ra_id);
            return acc;
          },
          {} as Record<string, Shift>,
        );

        const hydratedSchedule = Object.values(groupedMap).sort((a, b) =>
          a.date.localeCompare(b.date),
        );

        setSchedule(hydratedSchedule);
      }
    }
    initAdmin();
  }, [fetchLogs]);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }
  const getRaName = (id: string) =>
    ras.find((r) => r.id === id)?.name || "Unknown";

  async function handleGenerate() {
    if (!startDate || !endDate) {
      triggerAlert("Missing Dates", "Please set both a start and end date.", "error");
      return;
    }
    if (parseISO(startDate) >= parseISO(endDate)) {
      triggerAlert("Invalid Date Range", "End date must be after start date.", "error");
      return;
    }
    setLoading(true);
    try {
      const { data: templates } = await supabase
        .from("availability")
        .select("*");
      const { data: preferences } = await supabase
        .from("shift_preferences")
        .select("*");
      const start = parseISO(startDate);
      const end = parseISO(endDate);

      const generated = generateSemesterSchedule(
        start,
        end,
        ras,
        templates || [],
        preferences || [],
      );
      setSchedule(generated);
      triggerAlert(
        "Generated!",
        `Created schedule with ${generated.length} shifts.`,
        "success",
      );
    } catch (e) {
      console.error(e);
      triggerAlert("Generation Failed", errorMessage(e), "error");
    } finally {
      setLoading(false);
    }
  }

  function requestDelete(log: PublishLog) {
    setConfirmState({
      isOpen: true,
      title: "Delete Log & Unpublish",
      message: `Are you sure you want to unpublish the schedule for ${format(parseISO(log.semester_start), "MMM d")} - ${format(parseISO(log.semester_end), "MMM d")}? \n\n⚠️ THIS WILL DELETE ALL SHIFTS for this date range from the database.`,
      onConfirm: () => executeDeleteLog(log),
      confirmText: "Unpublish & Delete",
      isDestructive: true,
    });
  }

  async function executeDeleteLog(log: PublishLog) {
    setLoading(true);
    try {
      const { error: schedError } = await supabase
        .from("schedule")
        .delete()
        .gte("date", log.semester_start)
        .lte("date", log.semester_end);
      if (schedError)
        throw new Error(
          "Failed to delete schedule data: " + schedError.message,
        );

      const { error: logError } = await supabase
        .from("publish_logs")
        .delete()
        .eq("id", log.id);
      if (logError)
        throw new Error("Failed to delete log entry: " + logError.message);

      await fetchLogs();
      setSchedule([]);

      setConfirmState((prev) => ({ ...prev, isOpen: false }));
      triggerAlert("Unpublished", "Schedule removed.", "success");
    } catch (error) {
      console.error(error);
      setConfirmState((prev) => ({ ...prev, isOpen: false }));
      triggerAlert("Error", errorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  }

  function requestPublish() {
    setConfirmState({
      isOpen: true,
      title: "Confirm Publish",
      message: `You are about to publish the schedule from ${startDate} to ${endDate}.\n\nThis will OVERWRITE any existing schedule for these dates.`,
      onConfirm: executePublish,
      confirmText: "Confirm Publish",
      isDestructive: false,
    });
  }

  async function executePublish() {
    setLoading(true);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Session expired.");

      const adminId = user.id;
      const adminName =
        ras.find((r) => r.id === adminId)?.name || user.email || "Admin";

      const { error: deleteError } = await supabase
        .from("schedule")
        .delete()
        .gte("date", startDate)
        .lte("date", endDate);
      if (deleteError) throw new Error("Delete failed: " + deleteError.message);

      if (schedule.length === 0) throw new Error("Schedule empty.");
      const rows = schedule.flatMap((slot) =>
        slot.assignedRaIds.map((raId) => ({
          date: slot.date,
          shift_type: slot.type,
          ra_id: raId,
        })),
      );

      const { error: insertError } = await supabase
        .from("schedule")
        .insert(rows);
      if (insertError) throw new Error("Insert failed: " + insertError.message);

      await supabase.from("publish_logs").insert({
        admin_id: adminId,
        admin_name: adminName,
        semester_start: startDate,
        semester_end: endDate,
      });

      await fetchLogs();
      setConfirmState((prev) => ({ ...prev, isOpen: false }));
      triggerAlert("Published!", "Live now.", "success");
    } catch (error) {
      setConfirmState((prev) => ({ ...prev, isOpen: false }));
      const message = errorMessage(error);
      if (message.includes("Session expired")) navigate("/");
      else triggerAlert("Failed", message, "error");
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    if (schedule.length === 0 || ras.length === 0) return null;
    const counts: Record<string, number> = {};
    ras.forEach((r) => (counts[r.id] = 0));
    schedule.forEach((slot) =>
      slot.assignedRaIds.forEach((id) => {
        if (counts[id] !== undefined) counts[id]++;
      }),
    );
    const vals = Object.values(counts);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    const allStats = ras.map((r) => ({ name: r.name, count: counts[r.id] }));
    return {
      min,
      max,
      avg,
      minList: allStats.filter((s) => s.count === min),
      maxList: allStats.filter((s) => s.count === max),
      allStats,
    };
  }, [schedule, ras]);

  const groupedByMonth = useMemo(
    () =>
      schedule.reduce(
        (acc, shift) => {
          const month = format(parseISO(shift.date), "MMMM yyyy");
          if (!acc[month]) acc[month] = [];
          acc[month].push(shift);
          return acc;
        },
        {} as Record<string, Shift[]>,
      ),
    [schedule],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/80 p-5 sm:p-8 font-sans relative">
      <CustomAlert
        isOpen={alertState.isOpen}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        onClose={closeAlert}
      />

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onClose={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmState.onConfirm}
        isLoading={loading}
        confirmText={confirmState.confirmText}
        isDestructive={confirmState.isDestructive}
      />

      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Semester Scheduler
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Generate, preview, and publish the RA roster.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="px-3.5 py-2 text-sm font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl hover:bg-rose-100 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Date Range</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Start date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 focus:bg-white outline-none transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                End date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 focus:bg-white outline-none transition-all"
              />
            </div>
            <div className="flex gap-2 pb-0.5">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 active:scale-[0.97] transition-all duration-150 shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                {loading ? "Working…" : "Generate Schedule"}
              </button>
              {schedule.length > 0 && (
                <button
                  onClick={requestPublish}
                  className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 active:scale-[0.97] transition-all duration-150 shadow-md shadow-emerald-600/20"
                >
                  Publish Live
                </button>
              )}
            </div>
          </div>
        </div>

        {/* LOGS LIST */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-6">
          <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Publish History
          </h3>
          <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
            {publishLogs.length === 0 ? (
              <p className="text-sm text-slate-400 italic">
                No schedules published yet.
              </p>
            ) : (
              publishLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex justify-between items-center text-sm border-b border-slate-100 pb-2 mb-2 last:border-0"
                >
                  <div>
                    <span className="font-bold text-slate-800">
                      {log.admin_name}
                    </span>{" "}
                    published{" "}
                    <span className="mx-1 text-slate-500">
                      {format(parseISO(log.semester_start), "MMM d")} -{" "}
                      {format(parseISO(log.semester_end), "MMM d, yyyy")}
                    </span>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {new Date(log.published_at).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => requestDelete(log)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    title="Unpublish"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* --- NEW: FAIRNESS CHART --- */}
        {schedule.length > 0 && <FairnessChart schedule={schedule} ras={ras} />}

        {/* STATS CARDS */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <button
              onClick={() =>
                setModalData({
                  title: "All Staff Shifts",
                  list: stats.allStats.sort((a, b) => b.count - a.count),
                })
              }
              className="text-left bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-200 hover:-translate-y-0.5 transition-all duration-200 group"
            >
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 group-hover:text-indigo-500 transition-colors">
                Average Shifts
              </p>
              <p className="text-4xl font-bold text-slate-900 tabular-nums">{stats.avg}</p>
              <p className="text-xs text-slate-400 mt-1.5">across all RAs · click to view</p>
            </button>
            <button
              onClick={() =>
                setModalData({ title: "Most Shifts", list: stats.maxList })
              }
              className="text-left bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-emerald-200 hover:-translate-y-0.5 transition-all duration-200 group"
            >
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 group-hover:text-emerald-600 transition-colors">
                Most Shifts
              </p>
              <p className="text-4xl font-bold text-slate-900 tabular-nums">{stats.max}</p>
              <p className="text-xs text-slate-400 mt-1.5">{stats.maxList.map(s => s.name).join(", ")}</p>
            </button>
            <button
              onClick={() =>
                setModalData({ title: "Least Shifts", list: stats.minList })
              }
              className="text-left bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-rose-200 hover:-translate-y-0.5 transition-all duration-200 group"
            >
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 group-hover:text-rose-600 transition-colors">
                Least Shifts
              </p>
              <p className="text-4xl font-bold text-slate-900 tabular-nums">{stats.min}</p>
              <p className="text-xs text-slate-400 mt-1.5">{stats.minList.map(s => s.name).join(", ")}</p>
            </button>
          </div>
        )}

        {/* CALENDAR GRID */}
        <div className="space-y-8">
          {Object.entries(groupedByMonth).map(([month, shifts]) => (
            <div
              key={month}
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
            >
              <div className=" p-4 font-bold text-lg text-slate-700 border-b border-slate-200 sticky top-0 z-10 backdrop-blur-sm bg-slate-50/90">
                {month}
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shifts.map((shift) => (
                  <ShiftCard key={`${shift.date}-${shift.type}`} shift={shift} getRaName={getRaName} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* STATS MODAL */}
        {modalData && (
          <StatsModal
            title={modalData.title}
            list={modalData.list}
            onClose={() => setModalData(null)}
          />
        )}
      </div>
    </div>
  );
}
