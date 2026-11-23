import { format, parseISO, setHours } from "date-fns";

// We define the interface here to ensure we know what to expect
interface IcsShift {
  date: string;
  type: string; // Ensure this matches the property passed from ScheduleView
}

/** Build the text of an .ics calendar containing one event per shift. */
export function buildIcsContent(shifts: IcsShift[]): string {
  // 1. ICS Header
  let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//RAScheduler//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-TIMEZONE:America/New_York
`;

  // 2. Loop through shifts
  shifts.forEach((shift) => {
    const date = parseISO(shift.date);

    // Ensure we are reading 'type', NOT 'shift_type'
    // Capitalize the first letter for the title (e.g., "Morning")
    const shiftLabel = shift.type.charAt(0).toUpperCase() + shift.type.slice(1);

    // Set hours: Morning (10am-5pm), Evening (5pm-11pm)
    const startHour = shift.type === "morning" ? 10 : 17;
    const endHour = shift.type === "morning" ? 17 : 23;

    const startStr = format(setHours(date, startHour), "yyyyMMdd'T'HHmmss");
    const endStr = format(setHours(date, endHour), "yyyyMMdd'T'HHmmss");

    icsContent += `BEGIN:VEVENT
SUMMARY:RA Duty (${shiftLabel})
DTSTART;TZID=America/New_York:${startStr}
DTEND;TZID=America/New_York:${endStr}
DESCRIPTION:Residence Hall Duty Shift
STATUS:CONFIRMED
END:VEVENT
`;
  });

  // 3. Footer
  icsContent += "END:VCALENDAR";

  return icsContent;
}

export function downloadCalendarFile(shifts: IcsShift[]) {
  const icsContent = buildIcsContent(shifts);

  // Trigger Download
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "my_ra_schedule.ics");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
