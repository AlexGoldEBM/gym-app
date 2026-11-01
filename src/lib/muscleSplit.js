// Muscle split for a session: how its working sets spread across body areas. Counted by sets
// (not volume) so timed/bodyweight exercises still register. Used by the share cards.
// A set counts fully for the exercise's primary muscle_group and half for each secondary_muscles
// entry; an area/region hit by both primary and secondary takes the larger share, not the sum.

const SECONDARY_WEIGHT = 0.5

// The six radar axes, in clockwise order from the top-left (matches the card layout).
export const SPLIT_AREAS = ['Back', 'Legs', 'Chest', 'Arms', 'Core', 'Shoulders']

// Library muscle_group -> radar axis.
const AREA_OF = {
  Chest: 'Chest', Back: 'Back', 'Lower Back': 'Back', Shoulders: 'Shoulders',
  Biceps: 'Arms', Triceps: 'Arms', Core: 'Core',
  Quads: 'Legs', Hamstrings: 'Legs', Glutes: 'Legs', Calves: 'Legs',
  Legs: 'Legs', // legacy group, migrated away by legacyLegsGroup()
}

// Library muscle_group -> body-map regions it lights up (FRONT / BACK figures in shareCards.js).
const REGIONS_OF = {
  Chest: ['chest'],
  Back: ['lats', 'traps'],
  'Lower Back': ['lowerBack'],
  Shoulders: ['delts', 'rearDelts'],
  Biceps: ['biceps', 'forearms'],
  Triceps: ['triceps'],
  Core: ['abs', 'obliques'],
  Quads: ['quads'],
  Hamstrings: ['hamstrings'],
  Glutes: ['glutes'],
  Calves: ['calves'],
  Legs: ['quads', 'glutes', 'calves'],
}
const ALL_REGIONS = [...new Set(Object.values(REGIONS_OF).flat())]

function workingSetCounts(session) {
  const counts = {}
  for (const set of session.sets || []) {
    if (set.set_type === 'warmup') continue
    counts[set.exercise_id] = (counts[set.exercise_id] || 0) + 1
  }
  return counts
}

// -> { areas: { Back: 0.27, ... } (shares summing to 1), regions: { chest: 0..1 } (relative
// to the busiest region), fullBody: [exercise] (spread evenly — usually a sign it needs recategorising) }
export function muscleSplit(session, exerciseMap = {}) {
  const areas = Object.fromEntries(SPLIT_AREAS.map(a => [a, 0]))
  const regions = Object.fromEntries(ALL_REGIONS.map(r => [r, 0]))
  const fullBody = []
  for (const [exId, n] of Object.entries(workingSetCounts(session))) {
    const ex = exerciseMap[exId]
    const group = ex?.muscle_group
    const exAreas = {}, exRegions = {}
    const hit = (g, w) => {
      exAreas[AREA_OF[g]] = Math.max(exAreas[AREA_OF[g]] || 0, w)
      for (const r of REGIONS_OF[g]) exRegions[r] = Math.max(exRegions[r] || 0, w)
    }
    if (AREA_OF[group]) {
      hit(group, 1)
    } else {
      // Full Body / unknown: share the sets across everything
      if (ex) fullBody.push(ex)
      for (const a of SPLIT_AREAS) exAreas[a] = 1 / SPLIT_AREAS.length
      for (const r of ALL_REGIONS) exRegions[r] = 1 / ALL_REGIONS.length
    }
    for (const g of ex?.secondary_muscles || []) if (AREA_OF[g]) hit(g, SECONDARY_WEIGHT)
    for (const [a, w] of Object.entries(exAreas)) areas[a] += w * n
    for (const [r, w] of Object.entries(exRegions)) regions[r] += w * n
  }
  const total = Object.values(areas).reduce((a, b) => a + b, 0)
  if (total) for (const a of SPLIT_AREAS) areas[a] /= total
  const maxRegion = Math.max(0, ...Object.values(regions))
  if (maxRegion) for (const r of ALL_REGIONS) regions[r] /= maxRegion
  return { areas, regions, fullBody }
}

// "Legs" was split into Quads / Hamstrings / Glutes / Calves. Seeded exercises take their new
// group from the seed; custom ones are guessed from the name (squat/press patterns -> Quads).
export function legacyLegsGroup(exercise, seedGroup) {
  if (seedGroup && seedGroup !== 'Legs') return seedGroup
  const n = (exercise.name || '').toLowerCase()
  if (/calf|calves/.test(n)) return 'Calves'
  if (/curl|hamstring|nordic|romanian|rdl|stiff/.test(n)) return 'Hamstrings'
  if (/glute|thrust|bridge|abduct|kickback|pull.?through/.test(n)) return 'Glutes'
  return 'Quads'
}
