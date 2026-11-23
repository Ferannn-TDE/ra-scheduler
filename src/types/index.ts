// Row shapes for the Supabase tables the app reads and writes.
// See supabase/schema.sql for the matching table definitions.

export type ShiftType = "morning" | "evening";

export interface RA {
  id: string;
  name: string;
}

export interface AvailabilityRow {
  ra_id: string;
  day_of_week: number; // 0 = Sunday ... 6 = Saturday
  shift_type: ShiftType;
}

export interface PreferenceRow {
  ra_id: string;
  day_of_week: number;
  shift_type: ShiftType;
}

export interface ScheduleRow {
  id: string;
  date: string; // yyyy-MM-dd
  shift_type: ShiftType;
  ra_id: string;
}

export interface PublishLog {
  id: string;
  admin_id: string;
  admin_name: string;
  semester_start: string;
  semester_end: string;
  published_at: string;
}

/** A busy slot detected by the timetable scanner. */
export interface ScheduleConflict {
  day: number;
  shift: ShiftType;
}
