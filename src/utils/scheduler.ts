import { addDays, format, differenceInDays } from "date-fns";
import { isMorningShiftDay } from "../constants/schedule";

export interface Shift {
  date: string;
  type: "morning" | "evening";
  assignedRaIds: string[];
  isUnderstaffed: boolean;
}

// CONFIGURATION
// A preference is worth "half a shift".
// This means if two RAs have equal shifts, the one who WANTS it gets chosen.
// It also means someone with 10 shifts won't beat someone with 2 shifts just because they "want" it.
const PREFERENCE_WEIGHT = 0.5;

function getRequiredStaff(dayOfWeek: number, type: "morning" | "evening") {
  if (type === "morning" && !isMorningShiftDay(dayOfWeek)) return 0; // Weekdays: No morning shifts
  if (type === "morning") return 1; // Weekends: 1 Morning RA
  return 2; // Evenings: Always 2 RAs
}

export function generateSemesterSchedule(
  startDate: Date,
  endDate: Date,
  allRas: any[],
  templateAvailability: any[], // { ra_id, day_of_week, shift_type }
  templatePreferences: any[], // { ra_id, day_of_week, shift_type }
): Shift[] {
  const schedule: Shift[] = [];

  // 1. Initialize Fairness Counters (Track total shifts per RA)
  const shiftCounts: Record<string, number> = {};
  allRas.forEach((ra) => (shiftCounts[ra.id] = 0));

  const totalDays = differenceInDays(endDate, startDate) + 1;

  for (let i = 0; i < totalDays; i++) {
    const currentDate = addDays(startDate, i);
    const dateStr = format(currentDate, "yyyy-MM-dd");
    const dayOfWeek = currentDate.getDay(); // 0 (Sun) to 6 (Sat)

    // Helper to process a shift type (Morning or Evening)
    const assignShift = (type: "morning" | "evening") => {
      const required = getRequiredStaff(dayOfWeek, type);
      if (required === 0) return;

      // STEP 1: POOL (Availability Constraint)
      // We ONLY look at people who explicitly said they are available.
      // This ensures "Availability is the fallback" because unavailable people strictly cannot be chosen.
      const availableCandidates = templateAvailability
        .filter((a) => a.day_of_week === dayOfWeek && a.shift_type === type)
        .map((a) => a.ra_id);

      // STEP 2: WEIGHTED SORT (Fairness + Preferences)
      // We sort candidates so the "best" choices (Lowest Score) are at the top.
      const sortedCandidates = availableCandidates.sort(
        (idA: string, idB: string) => {
          // A. Get Base Fairness Score (Their current actual workload)
          const countA = shiftCounts[idA];
          const countB = shiftCounts[idB];

          // B. Check if they specifically PREFER this slot
          const prefersA = templatePreferences.some(
            (p) =>
              p.ra_id === idA &&
              p.day_of_week === dayOfWeek &&
              p.shift_type === type,
          );
          const prefersB = templatePreferences.some(
            (p) =>
              p.ra_id === idB &&
              p.day_of_week === dayOfWeek &&
              p.shift_type === type,
          );

          // C. Calculate Final Score (Lower is Better)
          // If they prefer the shift, we artificially lower their "count" by 0.5.
          // This lets them beat someone with the SAME shift count, but loses to someone with WAY fewer shifts.
          const scoreA = countA - (prefersA ? PREFERENCE_WEIGHT : 0);
          const scoreB = countB - (prefersB ? PREFERENCE_WEIGHT : 0);

          return scoreA - scoreB;
        },
      );

      // STEP 3: SELECTION
      // Pick the top N candidates needed for this shift
      const selected = sortedCandidates.slice(0, required);

      // STEP 4: UPDATE COUNTERS
      // Increment the actual shift counts for fairness tracking
      selected.forEach((id: string) => shiftCounts[id]++);

      schedule.push({
        date: dateStr,
        type: type,
        assignedRaIds: selected,
        isUnderstaffed: selected.length < required,
      });
    };

    // Execute Logic for both shift types
    assignShift("morning");
    assignShift("evening");
  }

  return schedule;
}
