# Plan 001 — Registration, Calendar, and Chores backlog

Source: feature dump from 2026-07-15, refined through discussion the same day. This groups the
raw list into workstreams, notes what already exists in the codebase vs. what's net-new, and
sequences the work. All architectural questions below are resolved — see "Decisions locked in."
Remaining items are implementation details, not blockers.

## Decisions locked in

| # | Question | Decision |
|---|---|---|
| 1 | Deployment model | **Multi-tenant SaaS** — one deployment serves many households, not one-per-family. |
| 2 | Role model | Rename `Role.Parent` → `Role.Adult`; add `Role.Other`. Any `Adult` (not just the original registrant) gets PIN-elevation rights — households aren't assumed to be managed by one specific "parent." `Other` gets full read visibility into everything and can create calendar entries + receive reminders, but does **not** get PIN-elevation — no chore-group settings, bill management, household/device management, or child-account (email/password/PIN) management. |
| 3 | Web/app login | Email + password. |
| 4 | Wall display auth | Device-based: long-lived device token (see Workstream 3) + per-person PIN entry on top of that, since multiple family members share one mounted display. |
| 5 | Member accounts | Every family member gets their own login. Children may have no email — device/PIN-only. Adults manage email/password/PIN for child accounts. |
| 6 | Additional member credentials at registration | **Invite email** — each Adult/Other added during registration gets their own invite email (via the same Graph integration) and sets their own password later. The registering adult never sets or sees anyone else's password. |
| 7 | Email provider | **Microsoft Graph API** — App Registration + client secret already exist. Tenant ID / client ID / secret / sender address to be supplied via env vars or user secrets when implementation starts, not pasted into chat. |
| 8 | Reminders | Storage/display only for now — no delivery infrastructure (push/email) in this pass. |
| 9 | Travel Time storage | Store as an actual **date/time** ("leave-by" = event start − minutes), not a raw integer. Rationale: easy to filter/query directly once delivery infra exists later. Display converts it back to a minutes offset in the UI. Implementation note: if the event's start time is edited, recompute leave-by to preserve the minutes offset, rather than leaving it pinned to the old absolute time. |
| 10 | Week/Month "tap empty area to add" gesture | **Week view**: single tap on empty area adds an entry (no conflict — Week view has no day-selection concept today). **Month view**: single tap keeps selecting the day (existing behavior, shows agenda below); **long-press** on empty area starts a new entry instead, avoiding a conflict with day selection. |
| 11 | Device pairing | **QR code flow** (see Workstream 3) — no manual password or code typing on the shared display. |
| 12 | Device token lifetime | Sliding **7-day** expiry — a device can be offline up to a week before it must be re-paired via QR. Auto-refreshes **daily** while connected (see Workstream 3 for the refresh mechanism). |

---

## Key architectural note

The codebase is currently single-household-per-deployment: `HouseholdContext` is a literal
singleton populated once at startup (`Program.cs`, after migrate+seed), and there's no signup
endpoint. Decision #1 means this has to become a genuinely per-request tenant resolution — from
the authenticated user's session, or from a device token — before anything else in this plan can
be built. This is why **Workstream 1 (multi-tenant foundation) has to land first**; everything
else (registration, device pairing, even elevation checks) depends on household no longer being
implicit.

---

## Workstream 1 — Multi-tenant foundation (prerequisite, do first)

1. Replace singleton `HouseholdContext` with per-request resolution:
   - From a logged-in user's session → household via `user.HouseholdId`.
   - From a paired device's token → household the device was paired to.
2. Audit every controller currently assuming "the one household" (`HouseholdsController.Get()`
   does `db.Households...SingleAsync()` — this becomes "the household of the current
   session/device," not "the only row in the table").
3. `Role` enum: rename `Parent` → `Adult`, add `Other`. Update the one hard reference
   (`AuthController.VerifyPin`'s `u.Role == Role.Parent`) plus `DbSeeder.cs`. Elevation
   (`RequirePinElevationAttribute`-gated endpoints: chore-group settings, bill management,
   household/device management, child-account management) checks `Role.Adult` only — `Other` has
   full read access plus calendar-entry create/reminders, but never passes elevation checks.
4. New migration for the rename + any new columns from later workstreams (Travel Time, invite
   tokens, device tokens) — batch these into as few migrations as sensible.
5. Decide/keep a local dev seed (still useful for local development) separate from production,
   which now supports arbitrary households created via registration.

---

## Workstream 2 — Registration & Login

**Backend**
1. `POST /api/auth/register` — family name (not unique), first adult's name/email/password,
   plus up to 6 more members (name, role Adult/Child/Other). Adult/Other members: no password
   collected here. Child members: no email field at all.
2. Email verification for the first adult (required to activate the household) — new token table
   + `POST /api/auth/verify-email` + resend endpoint.
3. Invite flow for additional Adult/Other members — same/similar token mechanism, `POST
   /api/auth/accept-invite` (sets their own password), resend-invite endpoint.
4. Child accounts: created with no credentials; an Adult sets their PIN afterward via a UI on top
   of the existing `SetPin` endpoint pattern (already `RequirePinElevation`-gated).
5. `IEmailSender` via Microsoft Graph (`sendMail`), config wired to the existing App Registration
   secret. Three templates needed: verification, invite, welcome.
6. Real email+password login replacing/augmenting the avatar-tap flow for the phone/web app —
   PIN-based login (`AuthController.Login`/`select-profile`) stays as the wall-display path only.

**Frontend**
7. `/login`: email + password fields, "Family Registration" link, and a new **"Set up as Wall
   Display"** entry point (feeds Workstream 3).
8. `/register`: family name → first adult name/email/password → repeating up-to-6-member sub-form
   (name + role picker; email field only for Adult/Other, hidden for Child).
9. Email verification landing page + invite-acceptance page (token in URL → set password → login).
10. Settings: Adults can view/edit email, reset password (trigger new invite), and set/change PIN
    for Child accounts on the household.

**Depends on:** Workstream 1.

---

## Workstream 3 — Device pairing / Wall display (new — pulled in by decision #4/#11)

No "Device" concept exists in the code today; this is entirely new.

1. `POST /api/devices/pairing-session` (unauthenticated) — issues a short-lived pairing token.
   The wall display renders it as a QR code and opens a SignalR connection (reusing the existing
   `Hubs`/`IHouseholdNotifier` realtime infra already used for household updates) to wait for
   completion, rather than polling.
2. An Adult or Other, logged into their own phone/app, scans the QR code from Settings or the new
   "Set up as Wall Display" login-screen entry point. This calls `POST
   /api/devices/pair/{pairingToken}` authenticated as them — validates the token hasn't expired,
   prompts for a device name ("Kitchen iPad"), and mints a long-lived device token scoped to the
   *household* (not the pairing user — multiple people PIN into the same shared display).
3. Wall display receives the pairing-complete event over SignalR, stores the device token
   locally, and reloads into the existing PIN-select UI (`LoginScreen.tsx`'s avatar-tap +
   `PinPad` flow), now authenticated as a device rather than an anonymous single-household client.
4. Device token becomes a new auth path on the API alongside session cookies — requests from a
   paired device resolve household via the token.
5. **Settings → Devices**: list of paired displays (Adults only — `Other` doesn't manage
   devices/household settings, see decision #2) with rename + revoke. Not explicitly requested
   but recommended — without it, a lost/decommissioned iPad has no way to be cut off except a
   manual DB edit.
6. Token lifetime (decision #12): store an opaque token (hashed at rest, same pattern as
   `PinHash`) on a new `Device` entity with a sliding `ExpiresAt`. On each authenticated request,
   if the token hasn't been rotated in the last ~24h, issue a new token value, invalidate the old
   one, and reset `ExpiresAt` to now + 7 days — this piggybacks daily refresh on normal traffic
   with no separate background job needed on the device. If a device doesn't check in for 7 days,
   `ExpiresAt` lapses and it falls back to the QR pairing flow.

**Open implementation details (non-blocking):** exact on-device token storage, header vs. cookie
transport.

**Depends on:** Workstream 1 (household resolution) and Workstream 2 (real user login to scan
with).

---

## Workstream 4 — Calendar screen fixes

Current state: `DayView.tsx` has category filter pills but they're single-select
(`filter: EventCategory | "All"`); `WeekView`/`MonthView` have no filter pills at all. Tap-to-add
already exists on Week/Month via double-tap.

1. Convert the category filter to additive multi-select (empty set = show all); likely worth
   extracting a shared `CategoryFilterPills` component since it now needs to live in three views.
2. Add the same filter pills to `WeekView` and `MonthView`.
3. **Week view**: single tap on empty day area starts a new entry (replaces double-tap).
4. **Month view**: single tap keeps selecting the day (unchanged); **long-press** on empty area
   starts a new entry.
5. `MonthView` redesign: bigger day cells, a small inline title/snippet of the day's first
   entry/entries, overflow shown as dots — replaces the current dot-only cell + bottom agenda
   panel layout. Worth a quick mock check before building since it affects grid sizing on small
   screens.
6. Multi-day event rendering: views currently filter events by `isSameDay(new Date(e.start), day)`
   only, so multi-day events never show on days between start and end. Needs a real
   spans-this-day check plus per-day labeling: middle days show "All Day," the last day shows
   "Ends at {time}."

**Depends on:** nothing (independent, can start immediately).

---

## Workstream 5 — Calendar Add/Edit Entry screen rebuild

Rework of `EventFormModal.tsx`, which today is a bottom-sheet/centered modal.

1. Convert to a full-page screen; Save/Cancel move to icon buttons in a top header bar
   (currently a bottom action row).
2. Start/End rows: shrink the date input's width (currently `flex-1`, taking all remaining space)
   so label + date + time sit on one row.
3. Field reorder: **Category (default "Activities") → Title → Location → Participants → Start →
   End → Travel Time → Repeat → End Repeat (only if Repeat set) → Reminders → Description.**
   - Category currently defaults to `"Personal"` — change default.
   - "Participants" = rename of current "Attendees" pills.
4. **Travel Time** (net-new field, per decision #9): stored as a computed leave-by date/time on
   the `Event` domain model + migration; UI shows/accepts a minutes offset, computed against
   Start.
5. **Reminders** (net-new field, per decision #8): stored only, no delivery — needs schema +
   picker UI, no notification infra this pass.
6. Floating-label input pattern (label collapses into small inline text once a field has a value)
   — a shared input-component change, not per-field.
7. Repeat and Reminders open full pickers (bottom sheet or dedicated screen) instead of staying
   inline in the form.

**Depends on:** the Travel Time/Reminders migration can land alongside Workstream 1's migration
work; otherwise frontend-independent.

---

## Workstream 6 — Chores & Tasks

Backend is already done: `ChoreScheduling.cs` implements Daily/Weekly/CustomDays recurrence, and
`ChoresController` already has `POST`/`PATCH`/`DELETE`. The only gap is frontend — no create/edit
chore form exists (`ChoreDetailModal.tsx` only views/completes; `ChoreGroupSettings.tsx` only
manages the up-to-4 groups, not individual chores).

1. New "New Chore" entry point + edit affordance on existing chores.
2. Chore form: title, instructions, group, photo-required toggle, assignees, and a repeat picker
   — can likely reuse the recurrence picker being built for Workstream 5, since the underlying
   model (Daily/Weekly/CustomDays via weekday CSV) is the same shape on both `Chore` and calendar
   `Event`.
3. No backend changes expected; confirm `ChoreDtos.cs` already exposes everything the form needs
   before building.

**Depends on:** nothing (independent, smallest, good early win).

---

## Suggested sequencing

1. **Workstream 1** — multi-tenant foundation. Blocks 2 and 3.
2. **Workstream 6** (Chores form) — start in parallel with 1; fully independent.
3. **Workstream 4** (Calendar view fixes) — start in parallel with 1; fully independent.
4. **Workstream 2** (Registration/Login) — once Workstream 1 lands.
5. **Workstream 3** (Device pairing) — once Workstream 2 lands (needs real login to scan with).
6. **Workstream 5** (Add Entry rebuild) — migration can ride along with Workstream 1; frontend
   work can proceed any time after.

## Remaining open items (non-blocking — resolve during implementation)

- Exact on-device token storage and header vs. cookie transport for device auth.
- Invite/verification email expiry + resend UX details.
- Graph API credentials (tenant ID, client ID, secret, sender address) — needed from the user via
  env vars/user secrets before Workstream 2 backend work can be wired up end-to-end.
