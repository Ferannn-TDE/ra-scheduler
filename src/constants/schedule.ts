export const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// Morning shifts only exist on weekends (Sunday=0, Saturday=6)
export const MORNING_SHIFT_DAYS = new Set([0, 6]);
export const isMorningShiftDay = (dayIndex: number): boolean =>
  MORNING_SHIFT_DAYS.has(dayIndex);
