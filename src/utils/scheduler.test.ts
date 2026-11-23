import { describe, expect, it } from "vitest";
import { generateSemesterSchedule, type Shift } from "./scheduler";
import type { AvailabilityRow, PreferenceRow, ShiftType } from "../types";

// Local-time dates. 2026-01-17 is a Saturday.
const SAT = new Date(2026, 0, 17);
const SUN = new Date(2026, 0, 18);
const NEXT_SAT = new Date(2026, 0, 24);

const ALL_SLOTS: { day: number; shift: ShiftType }[] = [];
for (let day = 0; day < 7; day++) {
  ALL_SLOTS.push({ day, shift: "evening" });
  ALL_SLOTS.push({ day, shift: "morning" });
}

function availableEverywhere(raIds: string[]): AvailabilityRow[] {
  return raIds.flatMap((ra_id) =>
    ALL_SLOTS.map(({ day, shift }) => ({
      ra_id,
      day_of_week: day,
      shift_type: shift,
    })),
  );
}

function slot(ra_id: string, day_of_week: number, shift_type: ShiftType) {
  return { ra_id, day_of_week, shift_type };
}

function countShifts(schedule: Shift[]) {
  const counts: Record<string, number> = {};
  for (const s of schedule) {
    for (const id of s.assignedRaIds) counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

describe("generateSemesterSchedule: staffing rules", () => {
  const ras = ["a", "b", "c", "d"].map((id) => ({ id }));
  const schedule = generateSemesterSchedule(
    SUN,
    NEXT_SAT,
    ras,
    availableEverywhere(ras.map((r) => r.id)),
    [],
  );

  it("creates an evening shift every day and morning shifts only on weekends", () => {
    const evenings = schedule.filter((s) => s.type === "evening");
    const mornings = schedule.filter((s) => s.type === "morning");

    expect(evenings).toHaveLength(7);
    expect(mornings.map((s) => s.date)).toEqual(["2026-01-18", "2026-01-24"]);
  });

  it("staffs evenings with 2 RAs and weekend mornings with 1", () => {
    for (const shift of schedule) {
      const expected = shift.type === "evening" ? 2 : 1;
      expect(shift.assignedRaIds).toHaveLength(expected);
      expect(shift.isUnderstaffed).toBe(false);
    }
  });

  it("never assigns the same RA twice to one shift", () => {
    for (const shift of schedule) {
      expect(new Set(shift.assignedRaIds).size).toBe(shift.assignedRaIds.length);
    }
  });
});

describe("generateSemesterSchedule: availability", () => {
  it("only assigns RAs who marked the slot as available", () => {
    const schedule = generateSemesterSchedule(
      SAT,
      SAT,
      [{ id: "a" }, { id: "b" }],
      [slot("a", 6, "evening"), slot("b", 6, "morning")],
      [],
    );

    const morning = schedule.find((s) => s.type === "morning");
    const evening = schedule.find((s) => s.type === "evening");
    expect(morning?.assignedRaIds).toEqual(["b"]);
    expect(evening?.assignedRaIds).toEqual(["a"]);
  });

  it("flags a shift as understaffed when not enough RAs are available", () => {
    const schedule = generateSemesterSchedule(
      SAT,
      SAT,
      [{ id: "a" }],
      [slot("a", 6, "evening")],
      [],
    );

    const evening = schedule.find((s) => s.type === "evening");
    const morning = schedule.find((s) => s.type === "morning");
    expect(evening).toMatchObject({ assignedRaIds: ["a"], isUnderstaffed: true });
    expect(morning).toMatchObject({ assignedRaIds: [], isUnderstaffed: true });
  });
});

describe("generateSemesterSchedule: fairness", () => {
  it("spreads shifts evenly when everyone is equally available", () => {
    const ras = ["a", "b", "c", "d", "e"].map((id) => ({ id }));
    const schedule = generateSemesterSchedule(
      new Date(2026, 0, 18),
      new Date(2026, 2, 14), // eight weeks
      ras,
      availableEverywhere(ras.map((r) => r.id)),
      [],
    );

    const counts = Object.values(countShifts(schedule));
    expect(counts).toHaveLength(5);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  it("gives the shift to the RA who prefers it when workloads are tied", () => {
    const preferences: PreferenceRow[] = [slot("b", 6, "morning")];
    const schedule = generateSemesterSchedule(
      SAT,
      SAT,
      [{ id: "a" }, { id: "b" }],
      [slot("a", 6, "morning"), slot("b", 6, "morning")],
      preferences,
    );

    const morning = schedule.find((s) => s.type === "morning");
    expect(morning?.assignedRaIds).toEqual(["b"]);
  });

  it("does not let a preference beat an RA with a full shift less", () => {
    // Saturday morning: only "a" is available, so "a" starts Sunday one shift ahead.
    // Sunday morning: both are available and "a" prefers it, but the 0.5 bonus
    // is not enough to overcome a one-shift gap, so "b" gets it.
    const schedule = generateSemesterSchedule(
      SAT,
      SUN,
      [{ id: "a" }, { id: "b" }],
      [slot("a", 6, "morning"), slot("a", 0, "morning"), slot("b", 0, "morning")],
      [slot("a", 0, "morning")],
    );

    const sundayMorning = schedule.find(
      (s) => s.date === "2026-01-18" && s.type === "morning",
    );
    expect(sundayMorning?.assignedRaIds).toEqual(["b"]);
  });
});
