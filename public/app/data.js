/* ═══════════════════════════════════════════════════════════════
   qmtk Player Hub — DATA LAYER
   Pillars, attributes, play styles, pro comparisons, drill library.
   Edit drills here; the plan engine picks from this library.
   ═══════════════════════════════════════════════════════════════ */

const PILLARS = {
  technical: { label: 'Technical', code: 'TEC', icon: '⚽',
    attrs: ['firstTouch', 'dribbling', 'passing', 'shooting', 'weakFoot'] },
  tactical:  { label: 'Tactical',  code: 'TAC', icon: '🧠',
    attrs: ['positioning', 'decisions', 'offBall', 'defending', 'scanning'] },
  physical:  { label: 'Physical',  code: 'PHY', icon: '💪',
    attrs: ['speed', 'stamina', 'strength', 'agility', 'balance'] },
  mental:    { label: 'Mental',    code: 'MEN', icon: '🔥',
    attrs: ['confidence', 'focus', 'coachability', 'resilience', 'leadership'] },
  analysis:  { label: 'Analysis',  code: 'ANA', icon: '📊',
    attrs: ['selfReview', 'gameUnderstanding', 'goalSetting', 'videoStudy', 'habits'] }
};

const ATTR_META = {
  firstTouch:        { label: 'First Touch',          pillar: 'technical' },
  dribbling:         { label: 'Dribbling',            pillar: 'technical' },
  passing:           { label: 'Passing',              pillar: 'technical' },
  shooting:          { label: 'Shooting',             pillar: 'technical' },
  weakFoot:          { label: 'Weak Foot',            pillar: 'technical' },
  positioning:       { label: 'Positioning',          pillar: 'tactical' },
  decisions:         { label: 'Decision Making',      pillar: 'tactical' },
  offBall:           { label: 'Off-Ball Movement',    pillar: 'tactical' },
  defending:         { label: 'Defending',            pillar: 'tactical' },
  scanning:          { label: 'Scanning & Awareness', pillar: 'tactical' },
  speed:             { label: 'Speed',                pillar: 'physical' },
  stamina:           { label: 'Stamina',              pillar: 'physical' },
  strength:          { label: 'Strength',             pillar: 'physical' },
  agility:           { label: 'Agility',              pillar: 'physical' },
  balance:           { label: 'Balance',              pillar: 'physical' },
  confidence:        { label: 'Confidence',           pillar: 'mental' },
  focus:             { label: 'Focus',                pillar: 'mental' },
  coachability:      { label: 'Coachability',         pillar: 'mental' },
  resilience:        { label: 'Resilience',           pillar: 'mental' },
  leadership:        { label: 'Leadership',           pillar: 'mental' },
  selfReview:        { label: 'Self-Review',          pillar: 'analysis' },
  gameUnderstanding: { label: 'Game Understanding',   pillar: 'analysis' },
  goalSetting:       { label: 'Goal Setting',         pillar: 'analysis' },
  videoStudy:        { label: 'Video Study',          pillar: 'analysis' },
  habits:            { label: 'Training Habits',      pillar: 'analysis' }
};

/* How much each pillar counts toward the overall, per position (sums to 1) */
const POSITION_WEIGHTS = {
  GK:  { technical: 0.18, tactical: 0.22, physical: 0.20, mental: 0.25, analysis: 0.15 },
  DEF: { technical: 0.20, tactical: 0.28, physical: 0.24, mental: 0.16, analysis: 0.12 },
  MID: { technical: 0.28, tactical: 0.26, physical: 0.16, mental: 0.16, analysis: 0.14 },
  FWD: { technical: 0.30, tactical: 0.20, physical: 0.22, mental: 0.16, analysis: 0.12 }
};

const POSITIONS = { GK: 'Goalkeeper', DEF: 'Defender', MID: 'Midfielder', FWD: 'Forward' };

/* ── Play styles (player picks their identity, like FIFA play styles) ── */
const STYLES = {
  finisher: { name: 'The Finisher', icon: '🎯', tag: 'Ice in the veins. Lives for the goal.' },
  magician: { name: 'The Magician', icon: '🪄', tag: 'Flair, tricks, the unexpected.' },
  maestro:  { name: 'The Maestro',  icon: '🎼', tag: 'Sets the tempo. Sees every pass.' },
  engine:   { name: 'The Engine',   icon: '🔋', tag: 'Runs all day. Everywhere at once.' },
  wall:     { name: 'The Wall',     icon: '🛡️', tag: 'Nothing gets past. Wins every duel.' },
  rocket:   { name: 'The Rocket',   icon: '🚀', tag: 'Pure speed. Burns past anyone.' },
  general:  { name: 'The General',  icon: '📣', tag: 'Organizes, leads, lifts the team.' },
  cat:      { name: 'The Cat',      icon: '🧤', tag: 'Reflexes. Last line, first hero.' }
};

/* Suggested real-life comparison by style + position (player can override) */
const PRO_MAP = {
  finisher: { FWD: 'Erling Haaland',   MID: 'Jude Bellingham',  DEF: 'Virgil van Dijk',        GK: 'Emi Martínez' },
  magician: { FWD: 'Lionel Messi',     MID: 'Jamal Musiala',    DEF: 'Trent Alexander-Arnold', GK: 'Manuel Neuer' },
  maestro:  { FWD: 'Antoine Griezmann',MID: 'Pedri',            DEF: 'John Stones',            GK: 'Ederson' },
  engine:   { FWD: 'Gabriel Martinelli', MID: 'Federico Valverde', DEF: 'Achraf Hakimi',       GK: 'André Onana' },
  wall:     { FWD: 'Olivier Giroud',   MID: 'Rodri',            DEF: 'Virgil van Dijk',        GK: 'Thibaut Courtois' },
  rocket:   { FWD: 'Kylian Mbappé',    MID: 'Bukayo Saka',      DEF: 'Alphonso Davies',        GK: 'Alisson Becker' },
  general:  { FWD: 'Robert Lewandowski', MID: 'Luka Modrić',    DEF: 'Rúben Dias',             GK: 'Alisson Becker' },
  cat:      { FWD: 'Lionel Messi',     MID: 'Luka Modrić',      DEF: 'Rúben Dias',             GK: 'Gianluigi Donnarumma' }
};

/* ── qmtk video library (real reels from the qmtk Instagram) ── */
const QMTK_IG = 'https://www.instagram.com/qmtk.soccer/';
const REELS = [
  'https://www.instagram.com/reel/DYIidBPt7Av/',
  'https://www.instagram.com/reel/DYIm4nltpG8/',
  'https://www.instagram.com/reel/DYIpwCHtmDh/',
  'https://www.instagram.com/reel/DYpLzbmoOQ1/',
  'https://www.instagram.com/reel/DYrVIdZjBty/'
];

/* ── Drill library — 2 drills per attribute, 50 total ──
   a: attribute key | n: name | t: minutes | eq: equipment
   d: description | cue: coaching cue | v: video link */
const DRILLS = [
  /* Technical */
  { a: 'firstTouch', n: 'Wall Ping First Touch', t: 10, eq: 'Ball + wall',
    d: 'Pass against a wall, cushion the return with the inside of your foot, pass again. 50 touches each foot, increasing pace as you settle in.',
    cue: 'Soft foot — touch the ball out of your feet, never under them.', v: REELS[1] },
  { a: 'firstTouch', n: 'Toss–Control–Pass', t: 10, eq: 'Ball + wall or partner',
    d: 'Toss the ball in the air, control it out of the air with foot or thigh, then pass to a target in two touches max. 20 reps per surface.',
    cue: 'Meet the ball early — decide where your touch goes before it arrives.', v: REELS[1] },
  { a: 'dribbling', n: 'Cone Slalom — 3 Speeds', t: 12, eq: '6 cones + ball',
    d: 'Slalom through cones using inside, outside, then sole of the foot. Round 1 slow technique, round 2 game speed, round 3 timed against yourself.',
    cue: 'Small touches between cones, big acceleration out of the last one.', v: REELS[0] },
  { a: 'dribbling', n: '1v1 Shadow Moves', t: 10, eq: 'Ball + 1 cone',
    d: 'Approach the cone as if it were a defender and execute a move at game speed — scissors, chop, body feint. 10 reps per move, both directions.',
    cue: 'Sell the fake with your whole body, then explode away.', v: REELS[0] },
  { a: 'passing', n: 'Gate Passing Reps', t: 10, eq: '2 cones + wall or partner',
    d: 'Set a 1-yard cone gate between you and a wall or partner. Every pass must go through the gate. Step back a yard after every 10 clean passes.',
    cue: 'Plant foot points at the target, strike through the middle of the ball.', v: REELS[3] },
  { a: 'passing', n: 'Two-Touch Wall Rhythm', t: 10, eq: 'Ball + wall',
    d: 'Strict two-touch against a wall: first touch prepares, second touch passes. Alternate feet, keep a steady rhythm for 3 minutes, rest, repeat ×3.',
    cue: 'First touch sets up the pass — never let the ball stop.', v: REELS[3] },
  { a: 'shooting', n: 'Plant-Foot Finishing', t: 12, eq: 'Ball + goal or target',
    d: 'Place the ball, two-step approach, strike with laces at a corner target. 10 reps right foot, 10 left, then 10 off a self-pass moving ball.',
    cue: 'Plant foot beside the ball, lock the ankle, follow through to the target.', v: REELS[2] },
  { a: 'shooting', n: 'First-Time Finish', t: 12, eq: 'Ball + wall + goal',
    d: 'Play the ball off a wall and finish the rebound first-time. Vary the angle and pace of the feed. 20 finishes, count how many hit the target.',
    cue: 'Get your body set early — short backswing, clean contact.', v: REELS[2] },
  { a: 'weakFoot', n: 'Weak-Foot-Only Wall Work', t: 10, eq: 'Ball + wall',
    d: '100 passes and touches using ONLY your weak foot — passing, controlling, turning. Slow is fine; clean technique is the goal.',
    cue: 'Same technique as your strong foot — trust it, reps build it.', v: REELS[4] },
  { a: 'weakFoot', n: 'Weak-Foot Slalom & Finish', t: 12, eq: '4 cones + ball + target',
    d: 'Dribble a short slalom touching the ball only with your weak foot, then finish on a target with the weak foot. 15 full reps.',
    cue: 'Eyes up through the cones — finish like it’s your strong side.', v: REELS[4] },

  /* Tactical */
  { a: 'positioning', n: 'Track a Pro In Your Position', t: 15, eq: 'Any pro match video',
    d: 'Watch 15 minutes of a pro game but ONLY watch the player in your position — especially when they don’t have the ball. Note 3 things they do that you don’t.',
    cue: 'The best players do their work before the ball arrives.', v: QMTK_IG },
  { a: 'positioning', n: 'Re-Set On Every Dead Ball', t: 0, eq: 'Match / team training task',
    d: 'Game-day task: every throw-in, free kick, and goal kick, check your position against the team shape and fix it before play restarts.',
    cue: 'Dead balls are free moments — use every one to reorganize.', v: null },
  { a: 'decisions', n: 'Scan–Call–Play', t: 10, eq: 'Ball + partner',
    d: 'Partner passes and holds up fingers or calls a color as the ball travels. You must call it out BEFORE your first touch, then play back. 30 reps.',
    cue: 'Gather information while the ball travels — decide before it arrives.', v: null },
  { a: 'decisions', n: 'Two-Options Rule', t: 0, eq: 'Match / team training task',
    d: 'In every rondo, possession drill, and game: before the ball reaches you, know your two best options. If you get caught without one, that’s a rep to learn from.',
    cue: 'Never receive the ball without a plan A and a plan B.', v: null },
  { a: 'offBall', n: 'Third-Man Run Patterns', t: 10, eq: '3 cones + ball',
    d: 'Set cones as two teammates. Pass to cone A, sprint behind imaginary defender to cone B, receive your own rolled ball. Repeat the give-and-go pattern at speed.',
    cue: 'Pass and MOVE — standing still makes you easy to mark.', v: null },
  { a: 'offBall', n: 'Lose-Your-Marker Challenge', t: 0, eq: 'Match / team training task',
    d: 'Game-day task: 10 deliberate double-movements — check toward the ball, then spin away into space. Count them. Did you receive more passes than usual?',
    cue: 'Move your marker first, then attack the space they left.', v: null },
  { a: 'defending', n: '1v1 Defending Reps', t: 12, eq: 'Partner + ball + 2 cones',
    d: 'Partner attacks a 10-yard gate, you defend. Curve your approach, get low, stay patient, force them one way. Rotate every 5 reps.',
    cue: 'Don’t dive in — make them make the first mistake.', v: null },
  { a: 'defending', n: 'Shadow Jockey Footwork', t: 8, eq: '4 cones',
    d: 'Solo footwork: defensive stance, quick jockey steps between cones — sideways shuffle, drop-step, recover sprint. 30 seconds on, 30 off, ×6.',
    cue: 'Low hips, weight on the balls of your feet, never cross your legs.', v: null },
  { a: 'scanning', n: 'Shoulder-Check Habit Builder', t: 8, eq: 'Ball + wall',
    d: 'During wall passes, glance over each shoulder twice before every touch. Make it automatic: scan, touch, pass, scan. 5 minutes nonstop.',
    cue: 'Two looks before every touch — know what’s around you.', v: null },
  { a: 'scanning', n: 'Scan-Count Match Challenge', t: 0, eq: 'Match / team training task',
    d: 'Game-day task: scan over your shoulder before EVERY receive. Ask a parent or teammate to count your scans for one half. Beat your number next game.',
    cue: 'The picture changes every second — keep taking new photos.', v: null },

  /* Physical */
  { a: 'speed', n: '10-Yard Burst Sprints', t: 12, eq: '2 cones',
    d: '8 maximal 10-yard accelerations from different starts: standing, half-kneeling, lying down. Full recovery (60–90s) between reps — quality over quantity.',
    cue: 'Drive the first 3 steps — low, powerful, pumping arms.', v: null },
  { a: 'speed', n: 'Flying 20s', t: 12, eq: '3 cones',
    d: 'Jog 10 yards, then hit FULL speed for 20 yards, then decelerate. 6 reps with full recovery. Trains top-end speed safely.',
    cue: 'Relax your face and shoulders — tension kills speed.', v: null },
  { a: 'stamina', n: 'Interval Box Runs', t: 15, eq: '4 cones (20×20 yd)',
    d: '30 seconds hard running around the box, 30 seconds walking. 10 rounds. Track how many laps you complete and beat it next week.',
    cue: 'The hard rounds win games in the last 10 minutes.', v: null },
  { a: 'stamina', n: 'Tempo Dribble Laps', t: 15, eq: 'Ball + open space',
    d: 'Dribble continuous laps at 70% pace for 4 minutes, rest 1 minute, repeat ×3. Conditioning WITH the ball — stamina that transfers to games.',
    cue: 'Keep the ball within two steps even when your legs burn.', v: null },
  { a: 'strength', n: 'Bodyweight Power Circuit', t: 15, eq: 'None',
    d: '3 rounds: 12 squats, 10 push-ups, 8 lunges per leg, 30-second plank, 10 squat jumps. Rest 90 seconds between rounds. Perfect form only.',
    cue: 'Control down, explode up.', v: null },
  { a: 'strength', n: 'Shield & Hold Battles', t: 10, eq: 'Ball + partner',
    d: 'Protect the ball from a partner for 20 seconds using your body — arms out, low center, ball on the far foot. Swap roles. 5 rounds each.',
    cue: 'Put your body between the ball and the defender — own your space.', v: null },
  { a: 'agility', n: 'Quick-Feet Ladder Patterns', t: 10, eq: 'Ladder or 8 flat cones',
    d: 'Two feet in each square: forward, lateral, in-out. 4 passes per pattern, max foot speed. Finish each run with a 5-yard burst.',
    cue: 'Fast feet, quiet feet — land soft, move sharp.', v: REELS[4] },
  { a: 'agility', n: '5-Cone Star Cuts', t: 10, eq: '5 cones',
    d: 'One center cone, four corner cones 5 yards away. Sprint to a corner, plant the outside foot, cut hard back to center. 2 rounds of all corners, both feet.',
    cue: 'Plant and push off the OUTSIDE foot — that’s your change of direction.', v: null },
  { a: 'balance', n: 'Single-Leg Ball Taps', t: 8, eq: 'Ball',
    d: 'Stand on one leg, tap the top of the ball with the other foot 20 times without putting it down. Switch legs. 3 sets each, eyes up on the last set.',
    cue: 'Tall posture, still hips — wobble is fine, falling resets the rep.', v: null },
  { a: 'balance', n: 'Lunge Matrix + Holds', t: 8, eq: 'None',
    d: 'Lunge forward, sideways, and backward on each leg, holding the bottom position 3 seconds. 2 rounds. Finish with a 30-second single-leg balance each side.',
    cue: 'Knee tracks over the toe — strong landings make strong cuts.', v: null },

  /* Mental */
  { a: 'confidence', n: 'Highlight-Reel Visualization', t: 5, eq: 'None',
    d: 'Before training or a game, close your eyes and replay your 3 best-ever plays in full detail — what you saw, felt, heard. End picturing the next one.',
    cue: 'Your brain rehearses what you show it — show it your best.', v: null },
  { a: 'confidence', n: 'Brave-Touch Challenge', t: 0, eq: 'Match / team training task',
    d: 'Game-day task: demand the ball 10 times. Call for it loudly, show for it, and take your touch forward at least 5 of those times. Brave reps build belief.',
    cue: 'Confidence isn’t feeling ready — it’s asking for the ball anyway.', v: null },
  { a: 'focus', n: 'One-Cue Training', t: 0, eq: 'Any session',
    d: 'Pick ONE cue before each session (e.g., "first touch forward"). Grade yourself out of 10 after. One cue, fully locked in, beats five cues forgotten.',
    cue: 'Where your attention goes, your game grows.', v: null },
  { a: 'focus', n: 'Breath Reset Routine', t: 4, eq: 'None',
    d: 'Box breathing: in 4 seconds, hold 4, out 4, hold 4 — for 2 minutes before games. Use one cycle after any mistake to reset and re-enter the game.',
    cue: 'Control your breath, control your game.', v: null },
  { a: 'coachability', n: 'One-Question Habit', t: 0, eq: 'Any session',
    d: 'Ask your coach one specific question every session ("What should I do when their winger drops?"). Write the answer down afterward.',
    cue: 'The fastest improvers are the best question-askers.', v: null },
  { a: 'coachability', n: 'Feedback Loop Journal', t: 5, eq: 'Notebook',
    d: 'After each session write the last correction your coach gave you. Next session, show it fixed — then tell your coach you worked on it.',
    cue: 'Hearing feedback is good. Applying it is elite.', v: null },
  { a: 'resilience', n: 'Mistake Reset Ritual', t: 0, eq: 'Match / team training task',
    d: 'Build a 3-second reset: clap your hands, say your reset word ("next"), and sprint into position. Use it after EVERY mistake — no head-drops allowed.',
    cue: 'The next play is the only play.', v: null },
  { a: 'resilience', n: 'Hard-Rep Finisher', t: 5, eq: 'Ball',
    d: 'End every solo session with one skill you failed during it — and don’t leave until you land it once. Finish on a win, every time.',
    cue: 'Walk off the field having beaten the thing that beat you.', v: null },
  { a: 'leadership', n: 'Voice Reps', t: 0, eq: 'Match / team training task',
    d: 'Game-day task: 10 pieces of useful information per half — "time", "man on", "switch it", encouragement after a teammate’s mistake. Information, not noise.',
    cue: 'Leaders make teammates play better — talk is an assist.', v: null },
  { a: 'leadership', n: 'Captain’s Minute', t: 5, eq: 'Team training',
    d: 'Once a week, lead something: the warm-up, a huddle, or a drill explanation. Small reps of leading become natural leadership.',
    cue: 'You don’t need the armband to lead.', v: null },

  /* Analysis */
  { a: 'selfReview', n: '3-2-1 Post-Match Review', t: 10, eq: 'Notebook',
    d: 'After every game write: 3 things you did well, 2 things to improve, 1 action for the week. Two sentences each, same day while it’s fresh.',
    cue: 'A game you don’t review is a lesson you paid for and threw away.', v: null },
  { a: 'selfReview', n: 'Weekly Self-Rating Check', t: 10, eq: 'This app',
    d: 'Once a week, rate your own five pillars 1–99, then compare with your coach’s latest grades. Where you disagree most is where to look closest.',
    cue: 'Knowing yourself accurately is a superpower.', v: null },
  { a: 'gameUnderstanding', n: 'Watch With a Question', t: 25, eq: 'Any pro match',
    d: 'Watch one half of a pro match holding a single question: "Why is the press working?" or "When do they switch play?" Write 3 observations after.',
    cue: 'Watch like a student, not a fan.', v: null },
  { a: 'gameUnderstanding', n: 'Whiteboard Replay', t: 10, eq: 'Paper + pen',
    d: 'Draw one moment from your last game — where everyone was, what you chose, and what the BEST option was. One drawing per game builds game vision.',
    cue: 'If you can draw it, you understood it.', v: null },
  { a: 'goalSetting', n: 'Weekly Target Card', t: 5, eq: 'Notebook or this app',
    d: 'Every Monday set ONE measurable target for the week ("20 weak-foot passes per session", "5 scans before each receive"). Check it off Sunday.',
    cue: 'A target you can count is a target you can hit.', v: null },
  { a: 'goalSetting', n: 'Goal Ladder', t: 10, eq: 'Notebook',
    d: 'Take your season goal and break it into 4 monthly stepping stones, each with one number attached. Review the ladder on the 1st of each month.',
    cue: 'Big dreams are climbed one rung at a time.', v: null },
  { a: 'videoStudy', n: 'Pro In Your Position — Clip Study', t: 10, eq: 'YouTube / Instagram',
    d: 'Watch 10 minutes of clips of your pro comparison. Steal ONE habit — a movement, a touch, a scan — and use it in your next session on purpose.',
    cue: 'Don’t just admire them — rob them.', v: QMTK_IG },
  { a: 'videoStudy', n: 'Film Yourself Friday', t: 15, eq: 'Phone + tripod or a friend',
    d: 'Film one drill every week. Watch it back next to a pro doing the same skill. The gap you SEE is the gap you can close.',
    cue: 'The camera tells the truth your memory won’t.', v: QMTK_IG },
  { a: 'habits', n: '100 Daily Touches', t: 10, eq: 'Ball',
    d: 'Minimum 100 touches every single day — toe taps, bell touches, sole rolls. Track your streak in this app. Miss a day, start over.',
    cue: 'Champions are built on boring days.', v: REELS[0] },
  { a: 'habits', n: 'Session-Prep Routine', t: 5, eq: 'None',
    d: 'Same routine before every session: bag packed the night before, water filled, arrive 10 minutes early, same 5-minute personal warm-up. Routine = readiness.',
    cue: 'How you arrive is how you train.', v: null }
];
