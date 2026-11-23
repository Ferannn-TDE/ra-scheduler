# Roadmap

Planned work, roughly in order of effort. Items are numbered by tier (T2 = a few hours, T3 = half a day or more).

## Polish

### T2-10: Standardize input field styles

Give every text and date input the same style (border, radius, padding, focus ring) so forms look consistent across pages.

## Larger features and refactors

### T3-1: Split `AdminScheduler.tsx` into focused modules

The admin page handles data fetching, generation, publishing, unpublishing, stats and the publish log in one component. Target structure:

- `hooks/useScheduleData.ts`: load RAs, availability, preferences and publish logs
- `hooks/usePublish.ts`: publish and unpublish
- `components/PublishHistory.tsx`: publish log list
- `components/ScheduleStats.tsx`: the three stat cards and their modal
- `pages/AdminScheduler.tsx`: thin orchestration layer

### T3-2: Persistent navigation bar

Add a `NavBar` with role-specific links (RA: Availability, Preferences, Upload Schedule, Roster; Admin: Scheduler, Roster, Manage RAs), the signed-in user, and a single sign-out button. Remove the per-page back and logout buttons.

### T3-3: End-to-end database types

Shared row types now live in `src/types`. Next step: generate types from the Supabase schema (`supabase gen types typescript`) and pass them to `createClient` so query results are typed without casts.

### T3-4: Shift swap requests

- New table `swap_requests (id, requester_ra_id, target_shift_date, target_shift_type, proposed_ra_id, status, created_at)`.
- RAs can request a swap on their own shifts and pick from RAs who are available for that slot.
- Admins see a pending count and approve or deny; approval updates the two `schedule` rows.

### T3-5: RA roster management

New admin page at `/admin/ras` listing every RA with shifts this semester and whether availability and preferences are submitted. Actions: rename, delete (with a warning that it removes their availability, preferences and shifts).

### T3-6: Review step before publishing

Before the publish confirmation, show understaffed shift counts, RAs with zero shifts, and whether the generated range covers the requested dates. Require a review step when there are issues.

### T3-7: Browse past schedules

The roster view currently shows from the start of this month to six months ahead. Add month navigation or a semester picker (based on `publish_logs`) so past schedules can be viewed.

### T3-8: Email notifications on publish

Use a Supabase Database Webhook or Edge Function on `publish_logs` insert to email each RA their shifts for the published range. Requires collecting an email address for each RA.

## Security

- Move the Gemini call into a Supabase Edge Function so the API key never reaches the browser.
- Replace name-only RA login with real authentication (for example, magic links) and tighten RLS to per-RA rows.
- Store uploaded timetables in a private bucket and serve them with signed URLs.
