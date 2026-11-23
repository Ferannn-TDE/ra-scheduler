import { useState } from "react";
import { format, parseISO } from "date-fns";
import { SunIcon, MoonIcon } from "./icons";
import UserAvatar from "./UserAvatar";

export interface ShiftCardData {
  date: string;
  type: "morning" | "evening";
  assignedRaIds: string[];
  isUnderstaffed?: boolean;
}

interface ShiftCardProps {
  shift: ShiftCardData;
  getRaName: (id: string) => string;
  /** When provided, highlights shifts the current user is working and shows "(You)" */
  myId?: string | null;
}

export default function ShiftCard({
  shift,
  getRaName,
  myId = null,
}: ShiftCardProps) {
  const [showNames, setShowNames] = useState(true);
  const isMorning = shift.type === "morning";
  const amIWorking = !!myId && shift.assignedRaIds.includes(myId);
  const isUnderstaffed = shift.isUnderstaffed ?? false;

  return (
    <div
      onClick={() => setShowNames(!showNames)}
      className={`relative border rounded-xl overflow-hidden transition-all duration-200 cursor-pointer select-none
        ${
          amIWorking
            ? "bg-indigo-50/60 border-indigo-200 ring-1 ring-indigo-200 shadow-md"
            : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-md"
        }`}
    >
      {/* Shift-type accent bar */}
      <div
        className={`h-0.5 w-full ${
          isMorning ? "bg-gradient-to-r from-orange-400 to-amber-300" : "bg-gradient-to-r from-indigo-500 to-violet-500"
        }`}
        aria-hidden="true"
      />

      <div className="p-4 flex flex-col gap-3">
        {/* Header: Date & Badges */}
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <span
              className={`block font-bold text-sm tracking-tight ${amIWorking ? "text-indigo-900" : "text-slate-800"}`}
            >
              {format(parseISO(shift.date), "EEE, MMM d")}
            </span>
            {amIWorking && (
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-100 px-1.5 py-0.5 rounded inline-block mt-1">
                Your Shift
              </span>
            )}
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${
                isMorning
                  ? "bg-orange-50 text-orange-600 border-orange-100"
                  : "bg-violet-50 text-violet-600 border-violet-100"
              }`}
            >
              {isMorning ? <SunIcon /> : <MoonIcon />}
              <span>{shift.type}</span>
            </div>
            {isUnderstaffed && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                <span aria-hidden="true">⚠</span> Understaffed
              </span>
            )}
          </div>
        </div>

        {/* Avatars & Names */}
        <div className="flex flex-col gap-2">
          {shift.assignedRaIds.length > 0 ? (
            <>
              <div className="flex -space-x-1.5 overflow-hidden pl-0.5">
                {shift.assignedRaIds.map((id) => (
                  <UserAvatar key={id} name={getRaName(id)} />
                ))}
              </div>

              {showNames && (
                <div className="pt-2.5 border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="flex flex-wrap gap-1.5">
                    {shift.assignedRaIds.map((id) => (
                      <span
                        key={id}
                        className={`text-[11px] font-medium px-2 py-1 rounded-lg border flex items-center gap-1.5 ${
                          id === myId
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${id === myId ? "bg-indigo-500" : "bg-slate-400"}`}
                        />
                        {getRaName(id)}
                        {id === myId && (
                          <span className="text-indigo-400 font-normal">(You)</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {!showNames && (
                <p className="text-[10px] text-slate-400 font-medium pl-0.5">
                  {shift.assignedRaIds.length} {shift.assignedRaIds.length === 1 ? "name" : "names"} · tap to reveal
                </p>
              )}
            </>
          ) : (
            <span className="text-rose-500 text-xs font-semibold px-2.5 py-1.5 bg-rose-50 rounded-lg border border-rose-100 self-start">
              Unfilled
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
