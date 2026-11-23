# RA Scheduler — Improvement Plan

Generated from a full codebase audit (2026-04-07). Every item references specific files and line numbers.

---

## Tier 1 — Quick Wins (< 30 min each)

### ~~T1-1: Fix broken gradient class on Login page~~ ✅

- **File:** `src/pages/Login.tsx:79`
- **Change:** `bg-linear-to-br` → `bg-gradient-to-br`
- **Why:** `bg-linear-to-br` doesn't exist in Tailwind v4 in this form. The login background gradient is silently broken.

### ~~T1-2: Move Supabase credentials to environment variables~~ ✅

- **File:** `src/utils/supabase.ts`
- **Change:** Replace hardcoded URL and key with `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY`. Add both to `.env.local`. Verify `.env.local` is in `.gitignore`.
- **Why:** Credentials are literally in source code. If this repo is ever pushed to GitHub, the keys are permanently in git history.

### ~~T1-3: Replace all `alert()` calls with `CustomAlert`~~ ✅

- **Files:** `src/pages/Login.tsx:51`, `src/pages/Login.tsx:69`, `src/utils/ocr.ts:9`, `src/utils/ocr.ts:105`
- **Change:** Add `alertState` + `triggerAlert` pattern (already in Login/InputAvailability) and render `<CustomAlert>` instead of calling `alert()`.
- **Why:** Native `alert()` is jarring, blocks the JS thread, and is visually broken compared to the rest of the UI. There are 4 separate places still using it.

### ~~T1-4: Fix the broken `busyConflicts` guard in the AI scanner~~ ✅

- **File:** `src/pages/InputAvailability.tsx:104`
- **Change:** `if (!busyConflicts && !Array.isArray(busyConflicts))` → `if (!Array.isArray(busyConflicts))`
- **Why:** The current condition is logically inert — if `busyConflicts` is falsy the second clause is always true, so the condition is never false for null/undefined. For actual arrays (even empty `[]`), the first clause short-circuits to false, so the guard never triggers at all. It does nothing.

### ~~T1-5: Add `aria-hidden="true"` to all decorative emojis~~ ✅

- **Files:** `src/pages/Dashboard.tsx`, `src/pages/Login.tsx`, `src/pages/AdminScheduler.tsx`, `src/pages/ScheduleView.tsx`, `src/pages/InputAvailability.tsx`
- **Change:** Wrap every decorative emoji in `<span aria-hidden="true">`. Add `aria-label="..."` to any emoji used as a functional icon (e.g., the 📷 scan button).
- **Why:** Screen readers announce raw emoji text ("calendar emoji", "eyes emoji") as content, which is disruptive.

### ~~T1-6: Replace index-based keys with stable keys in shift card lists~~ ✅

- **Files:** `src/pages/AdminScheduler.tsx:611`, `src/pages/ScheduleView.tsx:312`
- **Change:** `key={i}` → `key={`${shift.date}-${shift.type}`}`
- **Why:** Array index keys cause React reconciliation bugs when the list is reordered or filtered.

### ~~T1-7: Remove dead dependencies from `package.json`~~ ✅

- **File:** `package.json`
- **Command:** `npm uninstall tesseract.js zustand react-hook-form fullcalendar`
- **Why:** None of these are imported anywhere. `tesseract.js` is 2MB+; `fullcalendar` is ~300KB. They bloat install time and risk accidental bundle inclusion.

### ~~T1-8: Delete dead code files~~ ✅

- **Delete:**
  - `src/utils/api.ts` (0 bytes, completely empty)
  - `src/styles/` (entire directory — 6 files, never imported by any component)
  - `src/context/RAContext.tsx` (never provided in `main.tsx`, never imported anywhere)
- **Fix:** Either wire up `AuthContext` properly (see T2-2) or remove it from `main.tsx` — currently `role` is always `null` because `setRole` is never called.
- **Why:** Dead code creates confusion for contributors and false confidence in the state management architecture.

### ~~T1-9: Add page title updates per route~~ ✅

- **Files:** Each page component's `useEffect`
- **Change:** Add `document.title = "Page Name | RA Scheduler"` in each page's mount effect.
- **Example:** `AdminScheduler.tsx` → `"Admin Scheduler | RA Scheduler"`, `InputAvailability.tsx` → `"My Availability | RA Scheduler"`
- **Why:** Every browser tab shows the same title regardless of which page is open. Basic usability requirement.

### ~~T1-10: Fix ICS file — add timezone and revoke object URL~~ ✅

- **File:** `src/utils/ics.ts`
- **Change 1:** Add `X-WR-TIMEZONE:America/New_York` to the VCALENDAR header and prefix each `DTSTART`/`DTEND` with `TZID=America/New_York:`.
- **Change 2:** After `link.click()` on line 53, add `setTimeout(() => URL.revokeObjectURL(url), 100)`.
- **Why:** Without timezone info, calendar apps interpret events as UTC — shifts appear at wrong times for users outside the server's timezone. The object URL is a memory leak.

### ~~T1-11: Memoize expensive computed values in AdminScheduler and ScheduleView~~ ✅

- **Files:** `src/pages/AdminScheduler.tsx:378`, `src/pages/AdminScheduler.tsx:402`; `src/pages/ScheduleView.tsx:217`, `src/pages/ScheduleView.tsx:227`
- **Change:** Wrap `stats` (IIFE at line 378), `groupedByMonth` (line 402), `myShifts` (ScheduleView line 227), and the ScheduleView `groupedByMonth` (line 217) in `useMemo` with appropriate dependency arrays.
- **Why:** These run on every state change. With a full semester of shifts and a modal interaction happening, this is real unnecessary computation.

---

## Tier 2 — Medium Effort (1–3 hours each)

### ~~✅ T2-1: Extract shared components and hooks to eliminate duplication~~

Create the following to remove ~300 lines of duplicated code:

**`src/components/ShiftCard.tsx`**

- Merge `AdminShiftCard` (`AdminScheduler.tsx:44–122`) and `PublicShiftCard` (`ScheduleView.tsx:54–160`) into one component.
- Props: `shift: { date, type, assignedRaIds | raIds }`, `getRaName: (id) => string`, `myId?: string | null`
- `myId` enables the "Your Shift" indigo highlight (only used in ScheduleView).

**`src/components/icons.tsx`**

- Move `SunIcon` and `MoonIcon` here — they're copy-pasted verbatim between `AdminScheduler.tsx:12–41` and `ScheduleView.tsx:9–38`.

**`src/hooks/useAlert.ts`**

- Extract the `alertState` + `triggerAlert` + `closeAlert` pattern copy-pasted into `InputAvailability.tsx`, `Preferences.tsx`, and `AdminScheduler.tsx`.
- Return `{ alertState, triggerAlert, closeAlert }`.

**`src/constants/schedule.ts`**

- Move `DAYS_OF_WEEK` array (defined in both `InputAvailability.tsx:7` and `Preferences.tsx:7`).
- Move `isMorningValid` function (defined in `InputAvailability.tsx:92` and `Preferences.tsx:108`).
- Move `getRaName` helper pattern.
- Move shift hours config (morning: 10–17, evening: 17–23) used in `ics.ts` and `scheduler.ts`.

### ~~✅ T2-2: Implement route guards~~

- **File:** Create `src/components/ProtectedRoute.tsx`
- **Logic:** Checks `localStorage.getItem("raId")` OR `supabase.auth.getSession()`. Redirects to `/` if neither. Accepts `adminOnly?: boolean` prop that blocks RA sessions.
- **File:** `src/App.tsx`
- **Change:** Wrap `/dashboard`, `/availability`, `/preferences`, `/upload`, `/schedule` with `<ProtectedRoute>`. Wrap `/admin/schedule` with `<ProtectedRoute adminOnly>`.
- Remove per-page auth checks from `Dashboard.tsx:11–31` and `AdminScheduler.tsx:167–176` once centralized.
- **Why:** Currently any URL is publicly accessible. An unauthenticated user can navigate to `/availability` and write to the `availability` table.

### ~~✅ T2-3: Fix the duplicate RA name vulnerability~~

- **File:** `src/pages/Login.tsx:22–43`
- **Option A (recommended):** Add a `UNIQUE` constraint on `ras.name` in Supabase. In the login handler, catch the unique-violation error (Postgres error code `23505`) and show a specific message: "An RA with this name already exists. If this is you, check your name's spelling exactly."
- **Option B:** If two RAs can legitimately share a name, add a disambiguation step on login — query for all matches and show a confirmation: "Are you [Jane Doe — 4 shifts]?"
- **Why:** Two RAs with identical names silently share an account. The second person's availability will overwrite the first person's data with no warning.

### ~~✅ T2-4: Consolidate the `isMorningValid` business rule~~

- **Files:** `src/pages/InputAvailability.tsx:92`, `src/pages/Preferences.tsx:108`, `src/utils/scheduler.ts:17`
- **Change:** Move to `src/constants/schedule.ts` (from T2-1):
  ```typescript
  export const MORNING_SHIFT_DAYS = new Set([0, 6]); // Sunday=0, Saturday=6
  export const isMorningShiftDay = (dayIndex: number) =>
    MORNING_SHIFT_DAYS.has(dayIndex);
  ```
- Import and use this in all three files.
- **Why:** The weekend-morning rule is defined in 3 separate places. Change the rule once and you need to find and update all 3.

### ~~✅ T2-5: Fix the `loading` state collision in Preferences~~

- **File:** `src/pages/Preferences.tsx`
- **Change:** Split into two separate state variables: `const [initialLoading, setInitialLoading] = useState(true)` and `const [saving, setSaving] = useState(false)`.
- During initial load: show a skeleton or disabled grid, not "Saving..." on the button.
- During save: disable the button and show "Saving...".
- **Why:** Currently `loading=true` shows "Saving..." in the button even while data is being fetched on mount. Misleading UX.

### ~~ ✅ T2-6: Validate date range before generating schedule~~

- **File:** `src/pages/AdminScheduler.tsx:236`
- **Change:** Before calling `generateSemesterSchedule`, add:
  ```typescript
  if (!startDate || !endDate) {
    triggerAlert(
      "Missing Dates",
      "Please set both a start and end date.",
      "error",
    );
    return;
  }
  if (parseISO(startDate) >= parseISO(endDate)) {
    triggerAlert(
      "Invalid Date Range",
      "End date must be after start date.",
      "error",
    );
    return;
  }
  ```
- **Why:** Reversed or equal dates silently produce an empty schedule with a misleading "Generated! Created schedule with 0 shifts" success message.

### ~~✅ T2-7: Add understaffed shift indicator~~

- **File:** `src/utils/scheduler.ts`
- **Change:** Add `isUnderstaffed: boolean` to the `Shift` interface. In `assignShift`, set it when `selected.length < required && required > 0`.
- **File:** `src/components/ShiftCard.tsx` (after T2-1)
- **Change:** Render a yellow `⚠ Understaffed` badge when `shift.isUnderstaffed` is true.
- **Why:** Currently a shift requiring 2 RAs that only got 1 looks identical to a correctly filled shift. Admins have no visibility into scheduling gaps.

### ~~✅ T2-8: Fix the stats modal in AdminScheduler~~

- **File:** `src/pages/AdminScheduler.tsx:618–643`
- **Change:** Replace the raw hand-rolled modal with a proper styled component. At minimum:
  - Style the `<h3>` with `font-bold text-slate-800 text-lg`
  - Replace the bare `<button>✕</button>` with a properly sized icon button matching the `ConfirmModal` / `CustomAlert` close button style
  - Add keyboard dismiss (ESC) handling
- **Why:** The stats modal is visually broken — unstyled heading, a bare `✕` character with no padding or hover state, inconsistent with every other modal in the app.

### ~~✅ T2-9: Link the `/upload` page from Dashboard~~

- **File:** `src/pages/Dashboard.tsx`
- **Change:** Add a 4th card to the RA navigation grid linking to `/upload`:
  ```tsx
  <Link to="/upload" className="group block ...">
    <div className="w-12 h-12 bg-amber-100 ...">📷</div>
    <h2>Upload My Schedule</h2>
    <p>
      Upload a screenshot of your class schedule for automatic conflict
      detection.
    </p>
  </Link>
  ```
- **Why:** `/upload` exists and is functional but completely orphaned — no link to it from anywhere in the UI. Users can only reach it by typing the URL.

### T2-10: Standardize input field styles across all pages

- **Files:** `src/pages/AdminScheduler.tsx:465–480` (date inputs), all other input fields
- **Change:** Apply a consistent input class string everywhere:
  ```
  border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-full
  ```
- The AdminScheduler date pickers currently have `border p-2 rounded` — they look like unstyled HTML elements next to everything else.
- **Why:** The date pickers look like they're from a different application. Visual inconsistency is immediately obvious to users.

---

## Tier 3 — Major Enhancements (half-day+)

### T3-1: Refactor AdminScheduler.tsx (647 lines) into focused modules

- **Current:** One 647-line file does auth checking, data fetching, schedule generation, publishing, unpublishing, fairness stats, log management, and renders a subcomponent inline.
- **Target structure:**
  - `src/hooks/useScheduleData.ts` — fetches RAs, availability, preferences, publish logs on mount
  - `src/hooks/usePublish.ts` — publish / unpublish operations
  - `src/components/AdminShiftCard.tsx` — extracted shift card (or merged into T2-1 ShiftCard)
  - `src/components/PublishHistory.tsx` — the scrollable log list section
  - `src/components/ScheduleStats.tsx` — the 3 stat cards + their modal
  - `src/pages/AdminScheduler.tsx` — reduced to ~150 lines of orchestration
- **Why:** 647-line component violates single responsibility and makes testing, debugging, and future changes unnecessarily hard.

### T3-2: Add a persistent navigation bar

- **Create:** `src/components/NavBar.tsx`
- **RA nav items:** Availability | Preferences | Upload Schedule | View Roster
- **Admin nav items:** Scheduler | View Roster | Manage RAs (future)
- **Common:** User name + role badge, Logout button
- **Remove:** All per-page "Back to Dashboard" one-off links and the duplicated logout buttons on each page.
- **Why:** Currently every page is a dead end. Navigation is inconsistent — some pages have back buttons, some have both back AND logout, some have neither. There's no persistent sense of where you are in the app.

### T3-3: Implement proper TypeScript types throughout

- **Create:** `src/types/index.ts` with:

  ```typescript
  export type ShiftType = "morning" | "evening";
  export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

  export interface RA {
    id: string;
    name: string;
    schedule_url?: string;
  }
  export interface AvailabilityRow {
    ra_id: string;
    day_of_week: DayOfWeek;
    shift_type: ShiftType;
    status: "available";
  }
  export interface PreferenceRow {
    ra_id: string;
    day_of_week: DayOfWeek;
    shift_type: ShiftType;
  }
  export interface ScheduleRow {
    id: string;
    date: string;
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
  ```

- **Replace:** All `any[]` state declarations in `AdminScheduler.tsx` (lines 130–134) and `any[]` params in `scheduler.ts:26–27`.
- **Why:** The core scheduling algorithm and most admin state operate on untyped `any`. A renamed DB column would cause a silent runtime bug — TypeScript would never catch it.

### T3-4: Add shift swap request system

- **New DB table:** `swap_requests (id, requester_ra_id, target_shift_date, target_shift_type, proposed_ra_id, status, created_at)`
- **RA view (ScheduleView):** On own shifts, show a "Request Swap" button. On click, show a list of RAs who are available for that slot. Submitting creates a swap_request row.
- **Admin view (AdminScheduler):** Show a badge count of pending swap requests. Admin can approve or deny. On approve, update the two relevant `schedule` rows.
- **Why:** This is the most glaring missing feature. Without it, swaps happen via text message and admins manually edit the database.

### T3-5: Add RA roster management for admins

- **New page:** `src/pages/AdminRAs.tsx` at route `/admin/ras`
- **Contents:** Table of all RAs with columns: Name, Shifts this semester, Availability submitted (yes/no), Preferences submitted (yes/no). Actions per row: Edit name, Delete (with cascade warning that removes availability, preferences, schedule entries).
- **Add to:** AdminScheduler header or future NavBar as "Manage RAs".
- **Why:** Admins currently can't view, search, or remove RAs. The table grows indefinitely. Departed RAs still appear in generated schedules.

### T3-6: Add conflict detection summary before publishing

- **File:** `src/pages/AdminScheduler.tsx` (or a new `src/components/ScheduleReview.tsx`)
- **Change:** Before showing the Publish confirm modal, compute and display:
  - Count of shifts with fewer RAs than required (understaffed)
  - List of RAs with 0 shifts assigned this semester (available but never selected)
  - Date range covered vs. date range requested (ensure the generated schedule covers the full window)
- Add a "Review N Issues" step between Generate and Publish if issues exist.
- **Why:** Admins have no quality gate. A schedule with 30 understaffed evenings can be published without any warning.

### T3-7: Add past schedule browsing to ScheduleView

- **File:** `src/pages/ScheduleView.tsx:180–182`
- **Current:** Date window is hardcoded to `startOfMonth(now)` → `+6 months`. Shifts before "now" are invisible.
- **Change:** Add a semester/date-range navigation control. Use the `publish_logs` table to show available published ranges and let users browse to them. Or add prev/next month navigation with lazy fetching.
- **Why:** If a user wants to see last month's schedule (to verify a shift happened, resolve a dispute), it's completely inaccessible. The data exists in the DB but the view window starts at today.

### T3-8: Add email notifications on schedule publish

- **Mechanism:** Supabase Database Webhook or Edge Function triggered on `publish_logs` INSERT.
- **Action:** Send an email to each RA (requires adding `email` column to `ras` table and collecting it at login) listing their assigned shifts for the published range.
- **Why:** Currently RAs have no way to know when a schedule is published. They must manually check the app. Shifts get missed.

---

## Known Bugs (fix before shipping to real users)

| Bug                              | File                    | Line    | Description                                                                                     |
| -------------------------------- | ----------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| Gradient class typo              | `Login.tsx`             | 79      | `bg-linear-to-br` not valid Tailwind v4                                                         |
| Dead guard condition             | `InputAvailability.tsx` | 104     | `!busyConflicts && !Array.isArray(...)` is logically inert                                      |
| Double feedback on scan error    | `ocr.ts`                | 99–105  | Non-MISSING_TIME_COLUMN errors call `alert()` AND throw, potentially showing two error messages |
| Understaffed shifts invisible    | `scheduler.ts`          | 88      | `slice(0, required)` silently returns fewer RAs than needed, no flag on the Shift object        |
| Empty schedule on reversed dates | `AdminScheduler.tsx`    | 245–266 | No validation that `startDate < endDate`; generates 0 shifts with a success alert               |
| Admin name resolution            | `AdminScheduler.tsx`    | 336     | `ras.find(r => r.id === adminId)` always fails — admins are not in the `ras` table              |
| ICS events in wrong timezone     | `ics.ts`                | 30–31   | No `TZID` on generated events; calendar apps interpret as UTC                                   |
| Object URL never revoked         | `ics.ts`                | 48      | `createObjectURL` blob leaked until page unload                                                 |
| Index keys on shift cards        | `AdminScheduler.tsx`    | 611     | `key={i}` causes React reconciliation bugs                                                      |
| Index keys on shift cards        | `ScheduleView.tsx`      | 312     | Same issue                                                                                      |
| `useNavigate` unused import      | `ScheduleView.tsx`      | 4       | Commented "Removed" but import still present                                                    |

---

## Dead Code Inventory (safe to delete)

| Item                | Location                      | Reason                                                       |
| ------------------- | ----------------------------- | ------------------------------------------------------------ |
| `api.ts`            | `src/utils/api.ts`            | 0 bytes, completely empty                                    |
| `styles/` directory | `src/styles/`                 | 6 files, imported nowhere — all components use Tailwind      |
| `RAContext.tsx`     | `src/context/`                | Never provided in `main.tsx`, never imported                 |
| `AuthContext` role  | `src/context/AuthContext.tsx` | Provided but `setRole` never called; `role` is always `null` |
| `tesseract.js`      | `package.json`                | Replaced by Gemini AI, never imported                        |
| `zustand`           | `package.json`                | Never imported                                               |
| `react-hook-form`   | `package.json`                | Never imported                                               |
| `fullcalendar`      | `package.json`                | Never imported                                               |
| `App.css`           | `src/App.css`                 | Vite boilerplate, not meaningfully used                      |
