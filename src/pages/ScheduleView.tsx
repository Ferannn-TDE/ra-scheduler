import { useState, useEffect, useMemo } from "react";
import { supabase } from "../utils/supabase";
import { format, parseISO, addMonths, startOfMonth } from "date-fns";
import { Link } from "react-router-dom";
import { downloadCalendarFile } from "../utils/ics";
import ShiftCard from "../components/ShiftCard";

// --- TYPES ---
interface ScheduleRow {
  id: string;
  date: string;
  shift_type: "morning" | "evening";
  ra_id: string;
}

interface ConsolidatedShift {
  date: string;
  type: "morning" | "evening";
  assignedRaIds: string[];
  isUnderstaffed: boolean;
}

// Extracted to module level so React doesn't recreate it on every render
const SkeletonCard = () => (
  <div className="border border-slate-100 rounded-lg p-3 bg-white animate-pulse">
    <div className="flex justify-between items-center mb-3">
      <div className="h-4 bg-slate-200 rounded w-24"></div>
      <div className="h-4 bg-slate-200 rounded w-16"></div>
    </div>
    <div className="flex gap-2">
      <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
      <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
    </div>
  </div>
);

// --- MAIN COMPONENT ---
export default function ScheduleView() {
  const [shifts, setShifts] = useState<ConsolidatedShift[]>([]);
  const [ras, setRas] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Semester Roster | RA Scheduler";
  }, []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const storedId = localStorage.getItem("raId");
      setMyId(storedId);

      const { data: raData } = await supabase.from("ras").select("id, name");
      if (raData) setRas(raData);

      const now = new Date();
      const startDateStr = format(startOfMonth(now), "yyyy-MM-dd");
      const endDateStr = format(addMonths(now, 6), "yyyy-MM-dd");

      const { data: rawData } = await supabase
        .from("schedule")
        .select("*")
        .gte("date", startDateStr)
        .lte("date", endDateStr)
        .order("date", { ascending: true });

      if (rawData) {
        const groupedMap = (rawData as ScheduleRow[]).reduce(
          (acc, row) => {
            const key = `${row.date}-${row.shift_type}`;
            if (!acc[key]) {
              acc[key] = {
                date: row.date,
                type: row.shift_type,
                assignedRaIds: [],
                isUnderstaffed: false,
              };
            }
            acc[key].assignedRaIds.push(row.ra_id);
            return acc;
          },
          {} as Record<string, ConsolidatedShift>,
        );

        setShifts(
          Object.values(groupedMap).sort((a, b) =>
            a.date.localeCompare(b.date),
          ),
        );
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const getRaName = (id: string) =>
    ras.find((r) => r.id === id)?.name || "Unknown";

  const groupedByMonth = useMemo(
    () =>
      shifts.reduce(
        (acc, shift) => {
          const month = format(parseISO(shift.date), "MMMM yyyy");
          if (!acc[month]) acc[month] = [];
          acc[month].push(shift);
          return acc;
        },
        {} as Record<string, ConsolidatedShift[]>,
      ),
    [shifts],
  );

  const myShifts = useMemo(
    () => shifts.filter((s) => myId && s.assignedRaIds.includes(myId)),
    [shifts, myId],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/20 p-5 sm:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Semester Roster
            </h1>
            {myShifts.length > 0 && (
              <button
                onClick={() => downloadCalendarFile(myShifts)}
                className="flex items-center gap-2 bg-white border border-indigo-200 text-indigo-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-50 active:scale-95 transition-all shadow-sm"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Add {myShifts.length} shifts to Calendar
              </button>
            )}
          </div>
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Dashboard
          </Link>
        </div>

        {loading && (
          <div className="space-y-8">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
              >
                <div className="bg-slate-50 p-4 border-b border-slate-100">
                  <div className="h-6 w-32 bg-slate-200 rounded animate-pulse"></div>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((j) => (
                    <SkeletonCard key={j} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && shifts.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-16 text-center">
            <div
              className="text-6xl mb-4 grayscale opacity-50"
              aria-hidden="true"
            >
              🗓️
            </div>
            <h2 className="text-xl font-bold text-slate-700">No Schedule Yet</h2>
            <p className="text-slate-500 mt-2">
              The admin is likely still building the roster.
            </p>
          </div>
        )}

        {!loading && shifts.length > 0 && (
          <div className="space-y-8">
            {Object.entries(groupedByMonth).map(([month, monthShifts]) => (
              <div
                key={month}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
              >
                <div className="p-4 font-bold text-lg text-slate-700 border-b border-slate-200 sticky top-0 z-10 backdrop-blur-sm bg-slate-50/90">
                  {month}
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {monthShifts.map((shift) => (
                    <ShiftCard
                      key={`${shift.date}-${shift.type}`}
                      shift={shift}
                      getRaName={getRaName}
                      myId={myId}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
