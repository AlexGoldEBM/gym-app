# Decisions & Judgment Calls

Notes on choices not fully specified by the brief, plus the manual steps that must be
done outside the codebase to get the app working end-to-end.

## Stack
- **React + Vite** (not Next.js) — SPA is the simplest fit for a PWA with Firebase client SDK; no SSR needed.
- **react-router-dom v6** for routing, **recharts** for progress charts.
- **vite-plugin-pwa** (Workbox `generateSW`) for the service worker + manifest.
- Build is code-split (firebase / charts / react vendor chunks) so the initial JS payload and caching are reasonable.

## Data model / schema
- **Sets are embedded as an array inside each session document** rather than a `sets` subcollection.
  Rationale: a workout session is read/written as one unit, this makes offline writes atomic, and a 2-person
  app will never approach the 1 MB document limit. PRs, charts, and "last time" are all computed in-memory from
  the sessions snapshot — no per-render re-fetch (satisfies "PRs visible without a noticeable delay").
- **Firestore layout**
  - `users/{uid}` — private profile `{ displayName, email, householdId, restDefaultSec }`
  - `users/{uid}/sessions/{sessionId}` — private workout logs (sets embedded)
  - `households/{hid}` — shared workspace `{ name, members: [uid], inviteCode, createdBy }`
  - `households/{hid}/exercises/{exId}` — shared exercise library (seeded + custom)
  - `households/{hid}/routines/{routineId}` — shared routine templates
- **Exercise IDs are slugs** of the name (e.g. `bench-press-barbell`) so seeding is idempotent and the same
  exercise has the same id on every device / re-import.
- **Household membership** lives on the household doc (`members` array) and is read by the security rules via
  `get()`. No custom claims, so joining is instant and needs no admin round-trip.

## Security rules (`firestore.rules`)
- Enforce the shared/private split server-side (hard requirement, not client-only):
  - Sessions: only `request.auth.uid == uid` can read/write their own.
  - Household exercises/routines: only members (`uid in household.members`).
  - Households are readable by any signed-in user (needed for invite-code lookup); update is allowed for members,
    or for a non-member who is *only adding themselves* (the join flow). Households can't be deleted from the client.
- **Manual step:** deploy these rules — `firebase deploy --only firestore:rules` (or paste into
  Firebase console → Firestore → Rules). They are NOT auto-applied.

## PRs
- Estimated 1RM uses the **Epley** formula `w * (1 + reps/30)`.
- PRs tracked per exercise: heaviest weight, best estimated 1RM, best volume (w×reps), best reps, and per-rep best
  weight. Warm-up sets are excluded from PRs. Duration exercises track best hold time.
- Sessions badge sets that were a 1RM PR *at the time they were logged*.

## Rest timer
- Auto-starts when a working set is marked done (warm-ups don't trigger it). Default is per-exercise, falling back
  to the routine default, then the user's profile default (120 s).
- Uses the **Screen Wake Lock API** (re-acquired on visibility change), a Web Audio beep, `navigator.vibrate`,
  and a Notification on completion. Standard mobile-web limitations apply: a backgrounded tab may throttle the
  interval, but the countdown is computed from an absolute `endsAt` timestamp so it stays correct when refocused.

## Offline (PWA)
- Firestore offline persistence via the v11 `persistentLocalCache` + `persistentMultipleTabManager`
  (the modern replacement for the deprecated `enableIndexedDbPersistence`).
- The active workout is also mirrored to `localStorage` so a refresh / crash mid-session doesn't lose entry.
- A slim non-intrusive banner appears only when `navigator.onLine` is false.

## Auth / onboarding
- Google Sign-In only. Popup with an automatic **redirect fallback** (popups are often blocked in installed iOS PWAs).
- First sign-in creates a bare profile, then onboarding prompts to **create** a household (seeds the 95-exercise
  library) or **join** one with a 6-char invite code (shown in Settings).

---

## Manual steps required (cannot be done from code)

1. **Vercel env vars** — add the six `VITE_FIREBASE_*` values (same as `.env.local`) under
   Settings → Environment Variables for Production, Preview, and Development.
2. **Firebase authorized domains** — once the Vercel URL is known, add it (and any custom domain) under
   Firebase Console → Authentication → Settings → Authorized domains, or Google Sign-In will fail in production.
3. **Deploy Firestore rules** — `firebase deploy --only firestore:rules` (or paste `firestore.rules` into the console).
4. **Historical data import** (one-time, run *after* Alex has signed in once and created a household):
   - Download a service-account key: Firebase console → Project Settings → Service accounts → Generate new private key.
   - Run:
     ```
     GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json \
     ALEX_EMAIL=alexgoldtraining@gmail.com \
     node scripts/import-hevy.mjs workout_data.csv
     ```
   - Sessions are keyed by start-time (`hevy-<ms>`) so re-running won't duplicate them. Exercise titles not in the
     seed library are created as custom exercises (defaulted to Full Body / Bodyweight — edit later in the app).

## Build / scripts
- `npm run dev` / `npm run build` / `npm run preview` — standard Vite.
- `npm run seed:gen` — regenerate `src/data/exerciseSeed.json` from `exercise_library_seed.csv`.
- `node scripts/make-icons.mjs` — regenerate PWA icons (committed under `public/`).
- `npm run import` — the Hevy import (see step 4 above for required env vars).

## Known scope cuts / future
- Distance/cardio: schema tolerates `distance_km` but no UI (out of scope per brief).
- Charts cover per-exercise weight / 1RM / volume with date ranges. Per-muscle-group volume was the optional
  bonus and is not built.
- Drag-to-reorder uses up/down buttons rather than touch DnD (simpler, reliable one-handed).
