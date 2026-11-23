import { describe, expect, it } from "vitest";
import { buildIcsContent } from "./ics";

function events(ics: string): string[] {
  return ics.split("BEGIN:VEVENT").slice(1);
}

describe("buildIcsContent", () => {
  it("wraps events in a calendar with a fixed timezone", () => {
    const ics = buildIcsContent([]);

    expect(ics.startsWith("BEGIN:VCALENDAR\nVERSION:2.0\n")).toBe(true);
    expect(ics).toContain("X-WR-TIMEZONE:America/New_York");
    expect(ics.endsWith("END:VCALENDAR")).toBe(true);
    expect(events(ics)).toHaveLength(0);
  });

  it("creates one event per shift", () => {
    const ics = buildIcsContent([
      { date: "2026-01-17", type: "morning" },
      { date: "2026-01-17", type: "evening" },
      { date: "2026-01-18", type: "evening" },
    ]);

    expect(events(ics)).toHaveLength(3);
    expect(ics.match(/END:VEVENT/g)).toHaveLength(3);
  });

  it("uses 10am-5pm for morning shifts", () => {
    const [event] = events(buildIcsContent([{ date: "2026-01-17", type: "morning" }]));

    expect(event).toContain("SUMMARY:RA Duty (Morning)");
    expect(event).toContain("DTSTART;TZID=America/New_York:20260117T100000");
    expect(event).toContain("DTEND;TZID=America/New_York:20260117T170000");
  });

  it("uses 5pm-11pm for evening shifts", () => {
    const [event] = events(buildIcsContent([{ date: "2026-01-17", type: "evening" }]));

    expect(event).toContain("SUMMARY:RA Duty (Evening)");
    expect(event).toContain("DTSTART;TZID=America/New_York:20260117T170000");
    expect(event).toContain("DTEND;TZID=America/New_York:20260117T230000");
  });

  it("keeps shift times correct on a daylight-saving change day", () => {
    // US clocks spring forward on 2026-03-08.
    const [event] = events(buildIcsContent([{ date: "2026-03-08", type: "morning" }]));

    expect(event).toContain("DTSTART;TZID=America/New_York:20260308T100000");
    expect(event).toContain("DTEND;TZID=America/New_York:20260308T170000");
  });
});
