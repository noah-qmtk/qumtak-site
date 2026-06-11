/* ═══════════════════════════════════════════════════════════════
   qmtk Player Hub — RATINGS + PLAN ENGINE
   Pure functions: grades in → ratings, tiers, deltas, dev plan out.
   generatePlan() is deterministic today; swap its body for an API
   call (/api/plan) when the coaching backend lands.
   ═══════════════════════════════════════════════════════════════ */

function clampRating(v) { return Math.max(1, Math.min(99, Math.round(v))); }

function pillarAverages(grades) {
  const out = {};
  for (const [key, p] of Object.entries(PILLARS)) {
    const vals = p.attrs.map(a => grades[a] || 50);
    out[key] = clampRating(vals.reduce((s, v) => s + v, 0) / vals.length);
  }
  return out;
}

function overallFor(grades, position) {
  const w = POSITION_WEIGHTS[position] || POSITION_WEIGHTS.MID;
  const piles = pillarAverages(grades);
  let ovr = 0;
  for (const [key, weight] of Object.entries(w)) ovr += piles[key] * weight;
  return clampRating(ovr);
}

function tierFor(ovr) {
  if (ovr >= 83) return { key: 'icon',   name: 'qmtk ICON' };
  if (ovr >= 70) return { key: 'gold',   name: 'GOLD' };
  if (ovr >= 55) return { key: 'silver', name: 'SILVER' };
  return { key: 'bronze', name: 'BRONZE' };
}

function ratingClass(v) {
  if (v >= 85) return 'r-elite';
  if (v >= 75) return 'r-great';
  if (v >= 65) return 'r-good';
  if (v >= 50) return 'r-fair';
  return 'r-low';
}

function letterGrade(v) {
  if (v >= 90) return 'A+'; if (v >= 85) return 'A'; if (v >= 80) return 'A−';
  if (v >= 75) return 'B+'; if (v >= 70) return 'B'; if (v >= 65) return 'B−';
  if (v >= 60) return 'C+'; if (v >= 55) return 'C'; if (v >= 50) return 'C−';
  return 'D';
}

/* attribute-level change between two assessments: { attr: ±n } */
function attrDeltas(prevGrades, currGrades) {
  if (!prevGrades) return null;
  const d = {};
  for (const a of Object.keys(ATTR_META)) {
    const diff = (currGrades[a] || 50) - (prevGrades[a] || 50);
    if (diff !== 0) d[a] = diff;
  }
  return d;
}

/* ── Development plan generator ──
   Priority score per attribute = gap-to-99 × pillar weight for the
   player's position, so a FWD's weak shooting outranks weak defending. */
function generatePlan(player, assessment) {
  const grades = assessment.grades;
  const pos = player.position || 'MID';
  const w = POSITION_WEIGHTS[pos] || POSITION_WEIGHTS.MID;

  const scored = Object.keys(ATTR_META).map(a => ({
    attr: a,
    rating: grades[a] || 50,
    score: (99 - (grades[a] || 50)) * (w[ATTR_META[a].pillar] || 0.2)
  })).sort((x, y) => y.score - x.score);

  // Top 3 focus areas from different pillars where possible, so the
  // plan covers the player's development broadly, not one hole 3×.
  const focus = [];
  const usedPillars = new Set();
  for (const s of scored) {
    const pillar = ATTR_META[s.attr].pillar;
    if (focus.length < 2 && usedPillars.has(pillar)) continue;
    focus.push(s); usedPillars.add(pillar);
    if (focus.length === 3) break;
  }

  const strongest = [...scored].sort((x, y) => y.rating - x.rating)[0];
  const best = [...Object.keys(ATTR_META)].map(a => ({ attr: a, rating: grades[a] || 50 }))
    .sort((x, y) => y.rating - x.rating)[0];

  const focusAreas = focus.map(f => ({
    attr: f.attr,
    label: ATTR_META[f.attr].label,
    pillar: ATTR_META[f.attr].pillar,
    pillarLabel: PILLARS[ATTR_META[f.attr].pillar].label,
    rating: f.rating,
    drills: DRILLS.filter(d => d.a === f.attr)
  }));

  const dailyTouchDrill = DRILLS.find(d => d.n === '100 Daily Touches');
  const f1Drill = focusAreas[0].drills[0];
  const f2Drill = focusAreas[1] ? focusAreas[1].drills[0] : focusAreas[0].drills[1];
  const mentalDrill = DRILLS.find(d => d.a === 'selfReview');

  const daily = [
    { title: dailyTouchDrill.n, mins: dailyTouchDrill.t, desc: 'Non-negotiable base: ' + dailyTouchDrill.cue },
    { title: f1Drill.n, mins: f1Drill.t || 10, desc: 'Priority №1 — ' + ATTR_META[focusAreas[0].attr].label },
    { title: f2Drill.n, mins: f2Drill.t || 10, desc: 'Priority №2 — ' + (focusAreas[1] ? ATTR_META[focusAreas[1].attr].label : ATTR_META[focusAreas[0].attr].label) },
    { title: 'Reflect: one line in your journal', mins: 2, desc: 'What got better today? One sentence is enough.' }
  ];

  const f3 = focusAreas[2] || focusAreas[0];
  const weekly = [
    { day: 'MON', title: 'Focus Session 1 — ' + focusAreas[0].label,
      items: focusAreas[0].drills.map(d => d.n), type: 'train' },
    { day: 'TUE', title: 'Physical Day',
      items: [pickPhysical(focusAreas, 0).n, pickPhysical(focusAreas, 1).n], type: 'physical' },
    { day: 'WED', title: 'Focus Session 2 — ' + (focusAreas[1] ? focusAreas[1].label : focusAreas[0].label),
      items: (focusAreas[1] || focusAreas[0]).drills.map(d => d.n), type: 'train' },
    { day: 'THU', title: 'Study Day — Eyes & Brain',
      items: ['Pro In Your Position — Clip Study', 'Watch With a Question'], type: 'study' },
    { day: 'FRI', title: 'Focus Session 3 — ' + f3.label,
      items: f3.drills.map(d => d.n), type: 'train' },
    { day: 'SAT', title: 'Game Day / Free Play',
      items: ['Match task: ' + matchTaskFor(focusAreas), 'Play free — try what you trained'], type: 'match' },
    { day: 'SUN', title: 'Recover & Review',
      items: ['3-2-1 Post-Match Review', 'Light stretch + plan next week'], type: 'rest' }
  ];

  const ovr = overallFor(grades, pos);
  const styleName = player.style && STYLES[player.style] ? STYLES[player.style].name : null;
  const headline = headlineFor(ovr, focusAreas[0]);
  const summary =
    `${player.name.split(' ')[0]}, your game is built on ${ATTR_META[best.attr].label.toLowerCase()} (${best.rating}) — that's your weapon, keep sharpening it. ` +
    `This cycle is about ${focusAreas[0].label.toLowerCase()}${focusAreas[1] ? ' and ' + focusAreas[1].label.toLowerCase() : ''}: ` +
    `close those gaps and your overall jumps fast, because they're weighted heavily for a ${POSITIONS[pos].toLowerCase()}. ` +
    (styleName ? `Train like ${styleName} you've chosen to be — ` : '') +
    `stack the daily routine, hit the weekly plan, and make the next grading day prove it.`;

  return { headline, summary, focusAreas,
    superStrength: { attr: best.attr, label: ATTR_META[best.attr].label, rating: best.rating },
    daily, weekly, generatedFor: assessment.date };
}

function pickPhysical(focusAreas, i) {
  const physFocus = focusAreas.find(f => f.pillar === 'physical');
  if (physFocus) return physFocus.drills[i % physFocus.drills.length];
  const base = [DRILLS.find(d => d.n === 'Interval Box Runs'), DRILLS.find(d => d.n === 'Bodyweight Power Circuit')];
  return base[i % base.length];
}

function matchTaskFor(focusAreas) {
  const taskDrill = focusAreas.flatMap(f => f.drills).find(d => d.t === 0);
  return taskDrill ? taskDrill.n : 'Brave-Touch Challenge';
}

function headlineFor(ovr, topFocus) {
  if (ovr >= 83) return 'Elite standards. Now defend them.';
  if (ovr >= 70) return 'Gold today. Icon is built in the gaps.';
  if (ovr >= 55) return 'The jump to Gold runs through ' + topFocus.label + '.';
  return 'Every pro started here. Stack the days.';
}
