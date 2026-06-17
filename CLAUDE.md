# Project Brief: Workout Tracker PWA

## What this is

A personal workout-tracking web app to replace Hevy, built as a Progressive Web App (PWA) so it installs to the home screen and works offline. Used by two people (Alex and Cindy) who share a routine/exercise library but keep their own private workout logs.

This document is the complete spec. Build as much of this as possible in one pass — a fully working app, not a skeleton. Where you must make a judgment call, make a reasonable one and note it in a `DECISIONS.md` file rather than stopping to ask.

---

## Stack

- **Frontend**: React + Vite (or Next.js if you think it's a better fit — your call, just stay consistent)
- **Styling**: Tailwind CSS, dark theme by default, no light mode needed for v1
- **Backend/Database**: Firebase — Firestore for data, Firebase Auth for login
- **Hosting**: Vercel
- **PWA**: installable, works offline, service worker caches the app shell and recent data
- **Auth**: Google Sign-In only (via Firebase Auth)

---

## UI style

Dense, data-rich layout — closer to Hevy's information density than a minimal/spacious design. Users should see a lot of relevant data at a glance (e.g. last time they did this exercise, current set list, PRs) without excessive scrolling or empty whitespace. Dark theme throughout. Prioritise fast data entry during a workout — this is used mid-set, often one-handed, so big tap targets for number entry and minimal taps to log a set.

---

## Users & data sharing model

Two users: Alex and Cindy. Both sign in with Google.

- **Shared**: exercise library, routine templates (the planned workouts/programs)
- **Private**: actual logged workout sessions, sets, weights, reps, history, PRs

So either user can create/edit a routine template and the other sees it, but when either of them *runs* that routine and logs sets, that data is only visible to them. Think of it as a shared "workout plan" but separate "training diaries."

Implementation suggestion: a `household` or shared workspace concept in Firestore that both user accounts belong to, with routines/exercises scoped to the household and logs scoped to the individual user. Use your judgment on exact schema, but keep this separation clean since it's a hard requirement, not a nice-to-have.

---

## Data model

### Exercises
Core fields:
- `id`
- `name` (e.g. "Bicep Curl (Barbell)")
- `base_movement` (e.g. "Bicep Curl" — useful for grouping variants)
- `muscle_group` (e.g. Chest, Back, Legs, Biceps, Triceps, Shoulders, Core, Lower Back, Hamstrings, Glutes, Full Body)
- `equipment` (e.g. Barbell, Dumbbell, Cable, Machine, Bodyweight, Kettlebell, Assisted, TRX, Weighted)
- `tracking_type`: either `weight_reps` (most exercises) or `duration` (e.g. planks — tracked by time held, not weight/reps)
- `created_by` (household-shared, but track who added it for reference)
- `is_custom` (true for user-added, distinguishes from seeded defaults)

Seed data: a CSV (`exercise_library_seed.csv`, provided alongside this brief) containing 95 real exercises from the user's actual Hevy export, already categorized by muscle group, equipment, and tracking type. Import this as the starting exercise library on first run / in a seed script. Users must also be able to add fully custom exercises with all the same fields — this was the #1 complaint about Hevy (custom exercises gated behind a paywall), so this needs to be frictionless and free.

### Routines (shared, household-level)
- `id`
- `name` (e.g. "Upper push pull 1")
- `created_by`
- `exercises`: ordered list of exercise references, each with:
  - target sets (count)
  - target reps (or rep range, e.g. 8-12)
  - optional target weight or "use last weight"
  - optional superset grouping (some exercises in the user's data are supersetted — grouped under a shared superset_id, performed back-to-back)
  - optional notes

### Workout Sessions (private, per-user)
- `id`
- `user_id`
- `routine_id` (optional — can log an ad-hoc workout not based on a routine)
- `title`
- `start_time`, `end_time`
- `description` / notes (optional)

### Sets (private, per-user, belongs to a session)
- `id`
- `session_id`
- `exercise_id`
- `set_index` (order within the exercise for that session)
- `set_type`: support at least `normal`, `warmup`, `failure`, `drop_set` (Hevy's export only used `normal`, but support these for future flexibility — keep it simple, don't over-engineer the variety)
- `weight_kg` (nullable — not used for duration-type exercises)
- `reps` (nullable — not used for duration-type exercises)
- `duration_seconds` (nullable — used for duration-type exercises like Plank)
- `rpe` (nullable, optional perceived-effort rating)
- `notes` (optional, maps to Hevy's exercise_notes)
- `superset_id` (nullable — links sets across exercises performed as a superset)

### Personal Records (derived/computed, private per-user)
Track at minimum: heaviest weight for a given rep count, estimated 1RM (use a standard formula like Epley), and best volume (weight × reps) per exercise. Recompute on each new set logged, or compute on-demand — your call on which is more efficient, but PRs should always be visible without a noticeable delay.

---

## Importing existing data

A real CSV export from Hevy (`workout_data.csv`) will also be provided. Columns: `title, start_time, end_time, description, exercise_title, superset_id, exercise_notes, set_index, set_type, weight_kg, reps, distance_km, duration_seconds, rpe`.

Build a one-time import script (run manually, not part of the live app UI) that reads this CSV and populates:
1. The exercise library (cross-reference against `exercise_library_seed.csv` for muscle group/equipment/tracking_type — match on `exercise_title`)
2. Historical workout sessions and sets, attributed to Alex's user account

This preserves real lifting history rather than starting from zero. Dates in the CSV are in the format `"16 Jun 2026, 14:37"` — parse accordingly. The `distance_km` column is present in the schema but unused in this dataset (no rows have values) — fine to support it in the data model for future-proofing but it's not a v1 priority.

---

## Features required for v1

### 1. Exercise logging (core loop)
- Start a workout (from a routine, or blank/ad-hoc)
- For each exercise: see previous performance (last weight/reps for this exercise) right next to the input
- Quick set entry: weight, reps (or duration, depending on exercise type), with minimal taps
- Add/remove sets on the fly
- Mark sets as warmup/failure/drop set
- Support supersets (group exercises, alternate between them)
- Finish workout → saves session

### 2. Rest timer
- Configurable default rest period (e.g. per exercise or per routine)
- Auto-starts after logging a set
- Visible countdown, with the ability to skip/add time
- Should work even if the screen is locked or the user switches apps briefly (standard mobile web timer limitations apply — use your best judgment on notifications/wake lock APIs to make this as reliable as possible within PWA constraints)

### 3. Routine templates
- Create/edit/delete routines (shared across household)
- Define exercises, target sets/reps, ordering, supersets
- Start a workout directly from a routine, pre-populated with targets and last-used weights

### 4. Progress graphs/charts
- Per-exercise progress over time (weight, volume, estimated 1RM)
- Should be filterable by date range
- Per-muscle-group volume over time is a nice bonus if time allows, not required

### 5. Exercise & routine management
- Browse/search exercise library by name or muscle group
- Add custom exercises (free, no restrictions)
- Edit/delete custom exercises (don't allow editing the seeded defaults' core identity, but allow hiding/archiving ones a user never uses)

### 6. History view
- List of past sessions, expandable to see full set details
- Basic stats: total workouts, this week/month volume, etc. — keep this simple for v1

### 7. Offline support (PWA)
- App shell, exercise library, and routines cached for offline use
- Logging a workout while offline should work seamlessly, queuing writes to Firestore for when connectivity returns (Firestore's offline persistence should handle most of this — enable it)
- Clear (but non-intrusive) indicator if the app is offline and data hasn't synced yet

### 8. Auth
- Google Sign-In via Firebase Auth
- On first sign-in, prompt to either create a new household or join an existing one (e.g. via invite code/link) — this is how Alex and Cindy end up sharing the same routines/exercise library

---

## Explicitly out of scope for v1 (don't build, but don't make decisions that block adding later)

- Distance-based cardio tracking (e.g. running) — schema should tolerate it, no UI needed now
- Social features beyond the two-person household sharing
- Plate calculator
- Bodyweight tracking
- Native mobile app wrapper (PWA only)
- Apple/iOS-specific distribution — Cindy will use this as a PWA in mobile Safari, which supports installable PWAs fine

---

## Build notes & priorities

- Get the core logging loop (#1) rock solid first — this is used every single workout and any friction here defeats the purpose of replacing Hevy
- Dark theme, dense layout, big tap targets for numeric entry — optimise for "using this mid-set at the gym," not for looking nice in a portfolio
- Don't gate ANY feature behind a future paywall concept — there is no monetisation for this app, it's personal
- Use Firestore security rules properly to enforce the shared/private data split — don't rely on client-side logic alone for this
- If you have to cut scope to ship a working v1, cut graphs/charts depth before cutting the core logging flow or offline support
- Write a short `DECISIONS.md` documenting any judgment calls made (schema choices, library choices, anything not explicitly specified above)

---

## Files provided alongside this brief

- `exercise_library_seed.csv` — 95 exercises pre-categorized with muscle_group, equipment, base_movement, and tracking_type
- `workout_data.csv` — raw Hevy export with full historical workout data for import
