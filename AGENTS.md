# Workout Tracker PWA — Project Guide

Personal workout-tracking PWA (Hevy replacement) for two users, Alex and Cindy. Both sign in with
Google; exercise library and routine templates are shared via a household, logged sessions/sets/PRs
are private per user.

**Status: built and deployed (v1).** This doc describes the app *as built*. Design rationale and
one-time setup steps live in `DECISIONS.md` — read it before changing schema or auth/offline behaviour.
(The original project brief is preserved in git history on the commit that added this file.)

## Stack (as built)

- React 18 + Vite 6, SPA with `react-router-dom` v6 — no SSR
- Tailwind CSS 3, dark theme only; Plus Jakarta Sans; dense layout, big tap targets (used mid-set)
- Firebase 11 — Auth (Google only) + Firestore (`persistentLocalCache`, multi-tab manager) in `src/firebase.js`
- `vite-plugin-pwa` (Workbox `generateSW`) for service worker + manifest
- Hosted on Vercel; `vercel.json` handles SPA rewrites + no-cache headers for `sw.js`

## What's built vs not

Built: full logging loop (start from routine or ad-hoc, last-performance shown next to inputs,
quick set entry, add/remove sets, normal/warmup/failure/drop_set, supersets), rest timer
(wake lock + beep + vibration + notification), routine template CRUD + "save as routine" from a past
workout, per-exercise progress charts (weight / est. 1RM / volume, date-range filter), exercise
library browse/search + free custom exercises + rename/recategorise seeded ones, history list with
expandable details and edit mode, offline support (Firestore persistence + active workout mirrored to
localStorage), household create/join via invite code, one-time Hevy CSV import.

Not built (deliberately): per-muscle-group volume charts, distance/cardio UI (schema tolerates it),
plate calculator, bodyweight tracking, anything beyond the two-person household. No paywall concepts, ever.

## Code map

- `src/store/AuthContext.jsx` — auth state, profile creation on first sign-in, sign-in flow
- `src/store/DataContext.jsx` — exercises/routines/household data; PRs computed in-memory from sessions snapshot
- `src/store/WorkoutContext.jsx` — active workout state, rest timer, localStorage mirroring of in-progress workout
- `src/pages/` — one file per route (`ActiveWorkout`, `Routines`, `RoutineEditor`, `Progress`,
  `History`, `SessionDetail`, `Exercises`, `ExerciseDetail`, `Settings`, `Onboarding`, `Login`, `Home`)
- `src/lib/` — `stats.js` (PRs/Epley), `ghostSets.js`, `routineRun.js`, `util.js`, `textScale.js`, `confetti.js`
- `firestore.rules` — server-side enforcement of the shared/private split

### Firestore layout

- `users/{uid}` — private profile `{ displayName, email, householdId, restDefaultSec }`
- `users/{uid}/sessions/{sessionId}` — private logs, **sets embedded as an array in the session doc**
- `households/{hid}` — `{ name, members: [uid], inviteCode, createdBy }`
- `households/{hid}/exercises/{exId}` and `households/{hid}/routines/{routineId}` — shared

## Commands

```
npm run dev        # Vite dev server
npm run build      # production build → dist/
npm run preview    # serve the build locally
npm run seed:gen   # regenerate src/data/exerciseSeed.json from exercise_library_seed.csv
npm run import     # Hevy import (needs GOOGLE_APPLICATION_CREDENTIALS + ALEX_EMAIL, see DECISIONS.md)
node scripts/make-icons.mjs  # regenerate PWA icons into public/
```

No test suite or linter is configured — don't invent commands for them.

## Gotchas & hard-won lessons

- **Sign-in must be popup-first on all devices**, falling back to `signInWithRedirect`. Starting with
  redirect caused an infinite redirect loop; popups are blocked inside installed iOS PWAs hence the fallback.
- **Rest timer must compute remaining time from an absolute `endsAt` timestamp** (background tabs throttle
  timers). Warm-up sets must not trigger it. Don't reference `startRest` inside effect dep arrays — caused a TDZ crash once.
- **Build toolchain packages (`@vitejs/plugin-react`, tailwind, postcss, autoprefixer) live in
  `dependencies`, not devDependencies** — the Vercel build fails otherwise (production install skips dev deps).
- **Never put Firebase web config values in docs/source** — `.env.local` (gitignored) and Vercel env vars
  only. The API key was redacted out of this doc once already.
- **Exercise IDs are slugs of the name** so seeding/re-import is idempotent; imported sessions are keyed
  `hevy-<startTimeMs>` so re-running the import never duplicates history.
- Reordering uses up/down buttons, not touch drag-and-drop (reliability one-handed beat DnD).

## Ops notes (manual steps, can't be done from code)

- Firestore rules are NOT auto-deployed: `firebase deploy --only firestore:rules`.
- New deployment domains must be added to Firebase Console → Authentication → Authorized domains or Google
  Sign-In fails there.
- Hevy import is one-time and manual — required env vars documented in `DECISIONS.md`.

## Working rules

- **Never push while `inbox/` holds anything besides `README.md`** — any file type, not just `.png`.
  Before commit/push, delete the contents (`find inbox -mindepth 1 ! -name README.md -delete`) or pause
  and ask the user; never push and just mention leftovers afterwards. It's the local screenshot drop,
  gitignored; keep the folder and its `README.md`. The `ship` skill (`.claude/skills/ship/SKILL.md`) enforces this too.
- Committing = use the `ship` skill: stage all, conventional-commit message from the diff, always push after committing.
