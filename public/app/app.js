/* ═══════════════════════════════════════════════════════════════
   qmtk Player Hub — APP
   Hash router + views. Coach mode grades, Player mode visualizes.
   Storage: localStorage today (demo); swap Store for an API client
   when the coaching backend lands. Share links carry full card data
   so a player can open their card with zero backend.
   ═══════════════════════════════════════════════════════════════ */

/* ── Store ── */
const Store = {
  KEY: 'qmtk_hub_v1',
  load() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || { players: [] }; }
    catch (e) { return { players: [] }; }
  },
  save(data) { localStorage.setItem(this.KEY, JSON.stringify(data)); },
  players() { return this.load().players; },
  get(id) { return this.players().find(p => p.id === id) || null; },
  upsert(player) {
    const data = this.load();
    const i = data.players.findIndex(p => p.id === player.id);
    if (i >= 0) data.players[i] = player; else data.players.push(player);
    this.save(data);
  },
  remove(id) {
    const data = this.load();
    data.players = data.players.filter(p => p.id !== id);
    this.save(data);
  }
};

const uid = () => 'p' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
const todayISO = () => new Date().toISOString().slice(0, 10);

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function avatarHue(id) {
  let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

function fmtDate(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function latest(player) {
  return player.assessments.length ? player.assessments[player.assessments.length - 1] : null;
}
function previous(player) {
  return player.assessments.length > 1 ? player.assessments[player.assessments.length - 2] : null;
}

/* ── Demo seed so the app feels alive on first open ── */
function seedDemo() {
  if (Store.players().length || localStorage.getItem('qmtk_hub_seeded')) return;
  const mk = (vals) => Object.fromEntries(Object.keys(ATTR_META).map((a, i) => [a, vals[i]]));
  Store.upsert({
    id: 'demo-leo', demo: true, name: 'Leo Carter', number: 8, age: 12,
    position: 'MID', foot: 'Right', style: 'maestro', pro: 'Pedri',
    goals: [{ text: 'Make the travel team this fall', done: false },
            { text: '500 weak-foot passes this month', done: true }],
    createdAt: '2026-05-01',
    assessments: [
      { date: '2026-05-08', grades: mk([66,62,72,55,48, 64,66,60,58,52, 60,68,52,64,62, 70,62,78,60,55, 58,62,55,50,64]),
        note: 'Great vision and always wants the ball. First touch under pressure and the weak foot are the next step — and shoot more, you have it in you.' },
      { date: '2026-06-05', grades: mk([70,64,75,58,53, 66,69,63,59,57, 61,70,54,66,63, 73,65,80,63,57, 62,65,58,54,67]),
        note: 'Big month. The weak foot work is showing and the tempo control in midfield was the best I have seen from you. Keep attacking the scanning habit — two looks, every touch.' }
    ]
  });
  Store.upsert({
    id: 'demo-maya', demo: true, name: 'Maya Brooks', number: 9, age: 13,
    position: 'FWD', foot: 'Left', style: 'finisher', pro: 'Erling Haaland',
    goals: [{ text: 'Score 10 goals this season', done: false }],
    createdAt: '2026-05-01',
    assessments: [
      { date: '2026-06-05', grades: mk([68,72,58,74,50, 60,62,70,45,55, 76,66,60,72,68, 78,68,70,72,60, 55,58,62,48,70]),
        note: 'Born finisher and frightening in behind. Link-up passing and your weak foot will unlock the next level — defenders will show you wide all season.' }
    ]
  });
  localStorage.setItem('qmtk_hub_seeded', '1');
}

/* ── Share links (no backend: full card travels in the URL hash) ── */
function encodeShare(player) {
  const slim = { ...player, assessments: player.assessments.slice(-3) };
  return btoa(unescape(encodeURIComponent(JSON.stringify({ v: 1, p: slim }))));
}
function decodeShare(b64) {
  try {
    const obj = JSON.parse(decodeURIComponent(escape(atob(b64))));
    return obj && obj.p && obj.p.name ? obj.p : null;
  } catch (e) { return null; }
}

/* ── Router ── */
const view = () => document.getElementById('view');
let playerTab = 'card';
let sharedPlayer = null;

function navigate(hash) { location.hash = hash; }

function route() {
  const h = location.hash || '#/';
  sharedPlayer = null;
  if (h.startsWith('#p=')) {
    sharedPlayer = decodeShare(h.slice(3));
    if (sharedPlayer) return renderPlayerExperience(sharedPlayer, { shared: true });
    return renderLanding('That share link looks broken — ask your coach to send a fresh one.');
  }
  const parts = h.replace(/^#\//, '').split('/').filter(Boolean);
  if (parts[0] === 'coach') {
    if (parts[1] === 'new') return renderCoachEditor(null);
    if (parts[1] === 'player' && parts[2]) {
      const p = Store.get(parts[2]);
      return p ? renderCoachEditor(p) : renderCoach();
    }
    return renderCoach();
  }
  if (parts[0] === 'player') {
    if (parts[1]) {
      const p = Store.get(parts[1]);
      return p ? renderPlayerExperience(p, {}) : renderPlayerPicker();
    }
    return renderPlayerPicker();
  }
  return renderLanding();
}

/* ═══════════════ LANDING ═══════════════ */
function renderLanding(error) {
  playerTab = 'card';
  view().innerHTML = `
  <div class="landing">
    ${error ? `<div class="flash flash-err">${escapeHtml(error)}</div>` : ''}
    <div class="landing-hero reveal-up">
      <div class="landing-badge">QMTK PLAYER HUB</div>
      <h1>Know your game.<br><span>Build your player.</span></h1>
      <p>Coach grades the five pillars. The Hub turns them into your card, your report,
         and an AI development plan built just for you.</p>
    </div>
    <div class="mode-grid">
      <a class="mode-card mode-coach reveal-up" href="#/coach">
        <div class="mode-icon">📋</div>
        <h2>Coach Mode</h2>
        <p>Manage your roster, grade players across Technical, Tactical, Physical, Mental
           &amp; Analysis, and send each player their card.</p>
        <span class="mode-cta">Open the office →</span>
      </a>
      <a class="mode-card mode-player reveal-up" href="#/player">
        <div class="mode-icon">🃏</div>
        <h2>Player Mode</h2>
        <p>See your rating, your strengths, what to improve — and the daily &amp; weekly
           plan that gets you there.</p>
        <span class="mode-cta">Reveal my card →</span>
      </a>
    </div>
    <div class="pillar-strip reveal-up">
      ${Object.values(PILLARS).map(p => `<div class="pillar-chip"><span>${p.icon}</span>${p.label}</div>`).join('')}
    </div>
  </div>`;
}

/* ═══════════════ COACH: ROSTER ═══════════════ */
function renderCoach() {
  const players = Store.players();
  view().innerHTML = `
  <div class="page">
    <div class="page-head">
      <div>
        <div class="crumb"><a href="#/">Hub</a> / Coach</div>
        <h1>Coach's Office</h1>
        <p class="page-sub">${players.length} player${players.length === 1 ? '' : 's'} on the roster</p>
      </div>
      <a class="btn btn-green" href="#/coach/new">+ Add Player</a>
    </div>
    ${players.length === 0 ? `
      <div class="empty-state">
        <div class="empty-icon">🧢</div>
        <h3>No players yet</h3>
        <p>Add your first player and run their first grading session.</p>
        <a class="btn btn-green" href="#/coach/new">+ Add Player</a>
      </div>` : `
      <div class="roster">
        ${players.map(p => {
          const a = latest(p);
          const ovr = a ? overallFor(a.grades, p.position) : null;
          const tier = ovr ? tierFor(ovr) : null;
          return `
          <a class="roster-row" href="#/coach/player/${p.id}">
            <div class="avatar" style="--hue:${avatarHue(p.id)}">${escapeHtml(initials(p.name))}</div>
            <div class="roster-info">
              <strong>${escapeHtml(p.name)} ${p.demo ? '<span class="demo-chip">DEMO</span>' : ''}</strong>
              <span>#${p.number || '–'} · ${POSITIONS[p.position] || p.position} · ${a ? 'graded ' + fmtDate(a.date) : 'not graded yet'}</span>
            </div>
            ${ovr ? `<div class="ovr-badge tier-${tier.key}">${ovr}</div>` : '<div class="ovr-badge ovr-none">—</div>'}
          </a>`;
        }).join('')}
      </div>`}
  </div>`;
}

/* ═══════════════ COACH: PLAYER EDITOR + GRADING ═══════════════ */
function renderCoachEditor(player) {
  const isNew = !player;
  const p = player || { id: uid(), name: '', number: '', age: '', position: 'MID',
    foot: 'Right', style: '', pro: '', goals: [], assessments: [], createdAt: todayISO() };
  const last = latest(p);
  const grades = {};
  for (const a of Object.keys(ATTR_META)) grades[a] = last ? (last.grades[a] || 50) : 50;
  const liveOvr = overallFor(grades, p.position);

  view().innerHTML = `
  <div class="page">
    <div class="page-head">
      <div>
        <div class="crumb"><a href="#/">Hub</a> / <a href="#/coach">Coach</a> / ${isNew ? 'New Player' : escapeHtml(p.name)}</div>
        <h1>${isNew ? 'New Player' : 'Grading: ' + escapeHtml(p.name)}</h1>
        <p class="page-sub">${isNew ? 'Profile first, then slide the grades.' : 'Slide each attribute 1–99. Saving creates a dated assessment.'}</p>
      </div>
      ${!isNew ? `<a class="btn btn-ghost" href="#/player/${p.id}">View player experience →</a>` : ''}
    </div>
    <div id="flash"></div>

    <div class="card form-card">
      <h3 class="form-title">Player Profile</h3>
      <div class="form-grid">
        <label>Name <input id="f-name" type="text" value="${escapeHtml(p.name)}" placeholder="Full name" maxlength="40"></label>
        <label>Jersey # <input id="f-number" type="number" min="1" max="99" value="${escapeHtml(p.number)}"></label>
        <label>Age <input id="f-age" type="number" min="4" max="40" value="${escapeHtml(p.age)}"></label>
        <label>Position
          <select id="f-position">
            ${Object.entries(POSITIONS).map(([k, v]) => `<option value="${k}" ${p.position === k ? 'selected' : ''}>${v} (${k})</option>`).join('')}
          </select>
        </label>
        <label>Strong Foot
          <select id="f-foot">${['Right', 'Left', 'Both'].map(f => `<option ${p.foot === f ? 'selected' : ''}>${f}</option>`).join('')}</select>
        </label>
      </div>
    </div>

    <div class="ovr-preview-bar">
      <div class="ovr-preview">
        <span class="ovr-preview-num" id="live-ovr">${liveOvr}</span>
        <span class="ovr-preview-label">LIVE OVERALL · <span id="live-tier">${tierFor(liveOvr).name}</span></span>
      </div>
      <div class="ovr-preview-pillars" id="live-pillars"></div>
    </div>

    ${Object.entries(PILLARS).map(([pk, pillar]) => `
      <div class="card pillar-card" data-pillar="${pk}">
        <div class="pillar-head">
          <h3>${pillar.icon} ${pillar.label} <span class="pillar-code">${pillar.code}</span></h3>
          <div class="pillar-avg ${ratingClass(50)}" data-pillar-avg="${pk}">–</div>
        </div>
        ${pillar.attrs.map(a => `
          <div class="grade-row">
            <span class="grade-label">${ATTR_META[a].label}</span>
            <input type="range" min="1" max="99" value="${grades[a]}" data-attr="${a}" class="grade-slider">
            <span class="grade-val ${ratingClass(grades[a])}" data-val="${a}">${grades[a]}</span>
          </div>`).join('')}
      </div>`).join('')}

    <div class="card form-card">
      <h3 class="form-title">Coach's Note <span class="hint">(the player sees this on their report)</span></h3>
      <textarea id="f-note" rows="3" placeholder="What stood out, what to attack next...">${last && last.date === todayISO() ? escapeHtml(last.note || '') : ''}</textarea>
    </div>

    <div class="action-bar">
      <button class="btn btn-green btn-lg" id="save-btn">${isNew ? 'Create Player & Save Grades' : 'Save Assessment'}</button>
      ${!isNew ? `<button class="btn btn-ghost" id="share-btn">🔗 Copy player's card link</button>
                  <button class="btn btn-danger" id="del-btn">Delete</button>` : ''}
    </div>

    ${!isNew && p.assessments.length ? `
      <div class="card form-card">
        <h3 class="form-title">Assessment History</h3>
        <div class="history">
          ${[...p.assessments].reverse().map(a => {
            const o = overallFor(a.grades, p.position);
            return `<div class="history-row"><span>${fmtDate(a.date)}</span><span class="ovr-badge sm tier-${tierFor(o).key}">${o}</span></div>`;
          }).join('')}
        </div>
      </div>` : ''}
  </div>`;

  /* live grade math */
  const readGrades = () => {
    const g = {};
    view().querySelectorAll('.grade-slider').forEach(s => g[s.dataset.attr] = parseInt(s.value, 10));
    return g;
  };
  const refresh = () => {
    const g = readGrades();
    const pos = document.getElementById('f-position').value;
    const piles = pillarAverages(g);
    const ovr = overallFor(g, pos);
    document.getElementById('live-ovr').textContent = ovr;
    document.getElementById('live-tier').textContent = tierFor(ovr).name;
    document.getElementById('live-pillars').innerHTML = Object.entries(PILLARS)
      .map(([k, pl]) => `<span class="mini-pillar"><b class="${ratingClass(piles[k])}">${piles[k]}</b>${pl.code}</span>`).join('');
    for (const [k] of Object.entries(PILLARS)) {
      const el = view().querySelector(`[data-pillar-avg="${k}"]`);
      el.textContent = piles[k];
      el.className = 'pillar-avg ' + ratingClass(piles[k]);
    }
  };
  view().querySelectorAll('.grade-slider').forEach(s => s.addEventListener('input', () => {
    const valEl = view().querySelector(`[data-val="${s.dataset.attr}"]`);
    valEl.textContent = s.value;
    valEl.className = 'grade-val ' + ratingClass(parseInt(s.value, 10));
    refresh();
  }));
  document.getElementById('f-position').addEventListener('change', refresh);
  refresh();

  document.getElementById('save-btn').addEventListener('click', () => {
    const name = document.getElementById('f-name').value.trim();
    if (!name) return flash('Give the player a name first.', true);
    p.name = name;
    p.number = document.getElementById('f-number').value;
    p.age = document.getElementById('f-age').value;
    p.position = document.getElementById('f-position').value;
    p.foot = document.getElementById('f-foot').value;
    delete p.demo;
    const g = readGrades();
    const note = document.getElementById('f-note').value.trim();
    const today = todayISO();
    const existing = p.assessments.find(a => a.date === today);
    if (existing) { existing.grades = g; existing.note = note; }
    else p.assessments.push({ date: today, grades: g, note });
    Store.upsert(p);
    if (isNew) { navigate(`#/coach/player/${p.id}`); }
    else {
      flash(`Saved — ${name} is now ${overallFor(g, p.position)} OVR. <a href="#/player/${p.id}">View their experience →</a>`);
      route();
      setTimeout(() => flash(`Saved — ${name} is now ${overallFor(g, p.position)} OVR. <a href="#/player/${p.id}">See their experience →</a>`), 0);
    }
  });

  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) shareBtn.addEventListener('click', () => {
    const url = `${location.origin}${location.pathname}#p=${encodeShare(p)}`;
    navigator.clipboard.writeText(url).then(
      () => flash('Card link copied — text it to your player. They open it and boom: card reveal.'),
      () => flash('Could not copy automatically — long-press the address bar after opening: ' + url, true)
    );
  });

  const delBtn = document.getElementById('del-btn');
  if (delBtn) delBtn.addEventListener('click', () => {
    if (confirm(`Remove ${p.name} from the roster? Their history goes too.`)) {
      Store.remove(p.id); navigate('#/coach');
    }
  });
}

function flash(msg, isErr) {
  const f = document.getElementById('flash');
  if (!f) return;
  f.innerHTML = `<div class="flash ${isErr ? 'flash-err' : 'flash-ok'}">${msg}</div>`;
  f.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ═══════════════ PLAYER: PICKER ═══════════════ */
function renderPlayerPicker() {
  const players = Store.players();
  view().innerHTML = `
  <div class="page">
    <div class="page-head"><div>
      <div class="crumb"><a href="#/">Hub</a> / Player</div>
      <h1>Whose card is it?</h1>
      <p class="page-sub">Pick your name. Got a link from your coach instead? Just open it.</p>
    </div></div>
    ${players.length === 0 ? `
      <div class="empty-state"><div class="empty-icon">🃏</div>
        <h3>No cards on this device</h3>
        <p>Ask your coach for your card link, or have them grade you in Coach Mode.</p>
        <a class="btn btn-ghost" href="#/coach">Open Coach Mode</a>
      </div>` : `
      <div class="roster">
        ${players.map(p => {
          const a = latest(p);
          const ovr = a ? overallFor(a.grades, p.position) : null;
          return `<a class="roster-row" href="#/player/${p.id}">
            <div class="avatar" style="--hue:${avatarHue(p.id)}">${escapeHtml(initials(p.name))}</div>
            <div class="roster-info"><strong>${escapeHtml(p.name)}</strong>
              <span>#${p.number || '–'} · ${POSITIONS[p.position] || p.position}</span></div>
            ${ovr ? `<div class="ovr-badge tier-${tierFor(ovr).key}">${ovr}</div>` : '<div class="ovr-badge ovr-none">—</div>'}
          </a>`;
        }).join('')}
      </div>`}
  </div>`;
}

/* ═══════════════ PLAYER EXPERIENCE ═══════════════ */
function renderPlayerExperience(p, opts) {
  const a = latest(p);
  if (!a) {
    view().innerHTML = `<div class="page"><div class="empty-state">
      <div class="empty-icon">⏳</div><h3>${escapeHtml(p.name)}, your first grading is coming</h3>
      <p>Once your coach grades you, your card lives here.</p>
      <a class="btn btn-ghost" href="#/">Back to Hub</a></div></div>`;
    return;
  }
  const revealKey = 'qmtk_revealed_' + p.id;
  const needsReveal = !sessionStorage.getItem(revealKey);

  const tabs = [
    ['card', '🃏 My Card'], ['report', '📋 Report'], ['plan', '🤖 My Plan'], ['profile', '⭐ Profile']
  ];
  view().innerHTML = `
  <div class="page player-page">
    ${opts.shared ? `<div class="shared-banner">🔗 ${escapeHtml(p.name.split(' ')[0])}'s card, shared by Coach
       <button class="btn btn-mini" id="claim-btn">Save to this device</button></div>`
      : `<div class="crumb"><a href="#/">Hub</a> / <a href="#/player">Player</a> / ${escapeHtml(p.name)}</div>`}
    <div class="ptabs">
      ${tabs.map(([k, l]) => `<button class="ptab ${playerTab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}
    </div>
    <div id="ptab-body">${renderPlayerTab(p, a, playerTab, opts)}</div>
  </div>
  ${needsReveal ? revealOverlayHTML(p, a) : ''}`;

  view().querySelectorAll('.ptab').forEach(b => b.addEventListener('click', () => {
    playerTab = b.dataset.tab;
    view().querySelectorAll('.ptab').forEach(x => x.classList.toggle('on', x === b));
    document.getElementById('ptab-body').innerHTML = renderPlayerTab(p, a, playerTab, opts);
    bindPlayerTab(p, a, opts);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }));
  bindPlayerTab(p, a, opts);

  const claim = document.getElementById('claim-btn');
  if (claim) claim.addEventListener('click', () => {
    Store.upsert(p);
    claim.textContent = '✓ Saved'; claim.disabled = true;
  });

  if (needsReveal) runReveal(p, a, revealKey);
}

function renderPlayerTab(p, a, tab, opts) {
  if (tab === 'report') return reportHTML(p, a);
  if (tab === 'plan') return planHTML(p, a);
  if (tab === 'profile') return profileHTML(p, opts);
  return cardTabHTML(p, a);
}
function bindPlayerTab(p, a, opts) {
  if (playerTab === 'profile') bindProfile(p, opts);
  if (playerTab === 'plan') bindPlan(p);
}

/* ── FUT card ── */
function futCardHTML(p, a, opts) {
  const ovr = overallFor(a.grades, p.position);
  const tier = tierFor(ovr);
  const piles = pillarAverages(a.grades);
  const style = p.style && STYLES[p.style] ? STYLES[p.style] : null;
  return `
  <div class="fut-card tier-${tier.key} ${opts && opts.big ? 'fut-big' : ''}">
    <div class="fut-shine"></div>
    <div class="fut-top">
      <div class="fut-rating"><span class="fut-ovr" data-ovr="${ovr}">${ovr}</span><span class="fut-pos">${p.position}</span></div>
      ${style ? `<div class="fut-style" title="${escapeHtml(style.name)}">${style.icon}</div>` : ''}
    </div>
    <div class="fut-avatar" style="--hue:${avatarHue(p.id)}">${escapeHtml(initials(p.name))}</div>
    <div class="fut-name">${escapeHtml(p.name.toUpperCase())}</div>
    <div class="fut-tier-label">${tier.name}</div>
    <div class="fut-stats">
      ${Object.entries(PILLARS).map(([k, pl]) =>
        `<div class="fut-stat"><b>${piles[k]}</b><span>${pl.code}</span></div>`).join('')}
    </div>
    <div class="fut-bottom">
      ${p.number ? `#${escapeHtml(p.number)}` : ''}${style ? ` · ${style.name}` : ''}${p.pro ? ` · plays like ${escapeHtml(p.pro)}` : ''}
    </div>
  </div>`;
}

/* ── Tab: Card ── */
function cardTabHTML(p, a) {
  const piles = pillarAverages(a.grades);
  const prev = previous(p);
  const dts = prev ? attrDeltas(prev.grades, a.grades) : null;
  return `
  <div class="card-tab">
    <div class="card-tab-top">
      ${futCardHTML(p, a, { big: true })}
      <div class="radar-wrap">
        <h3 class="side-title">PILLAR RADAR</h3>
        ${radarSVG(piles)}
        <p class="radar-note">Graded ${fmtDate(a.date)} by Coach</p>
      </div>
    </div>
    <h3 class="side-title" style="margin-top:2rem">FULL ATTRIBUTES</h3>
    <div class="attr-grid">
      ${Object.entries(PILLARS).map(([pk, pillar]) => `
        <div class="attr-block">
          <div class="attr-block-head">${pillar.icon} ${pillar.label}
            <b class="${ratingClass(piles[pk])}">${piles[pk]}</b></div>
          ${pillar.attrs.map(at => {
            const v = a.grades[at] || 50;
            const d = dts && dts[at];
            return `<div class="attr-row">
              <span>${ATTR_META[at].label}</span>
              <span class="attr-delta">${d ? (d > 0 ? `<i class="up">▲${d}</i>` : `<i class="down">▼${Math.abs(d)}</i>`) : ''}</span>
              <div class="attr-bar"><div class="attr-fill ${ratingClass(v)}" style="width:${v}%"></div></div>
              <b class="${ratingClass(v)}">${v}</b>
            </div>`;
          }).join('')}
        </div>`).join('')}
    </div>
  </div>`;
}

/* ── Tab: Report (EA after-match style) ── */
function reportHTML(p, a) {
  const prev = previous(p);
  const ovr = overallFor(a.grades, p.position);
  const prevOvr = prev ? overallFor(prev.grades, p.position) : null;
  const diff = prevOvr != null ? ovr - prevOvr : null;
  const piles = pillarAverages(a.grades);
  const dts = prev ? attrDeltas(prev.grades, a.grades) : null;

  const ranked = Object.keys(ATTR_META).map(at => ({ at, v: a.grades[at] || 50 }));
  const strengths = [...ranked].sort((x, y) => y.v - x.v).slice(0, 3);
  const weaknesses = [...ranked].sort((x, y) => x.v - y.v).slice(0, 3);
  const improvements = dts ? Object.entries(dts).filter(([, d]) => d > 0)
    .sort((x, y) => y[1] - x[1]).slice(0, 3) : [];

  return `
  <div class="report">
    <div class="report-head">
      <div class="report-title">
        <span class="report-eyebrow">PLAYER REPORT · ${fmtDate(a.date).toUpperCase()}</span>
        <h2>${escapeHtml(p.name)}</h2>
      </div>
      <div class="report-ovr">
        <span class="report-ovr-num">${ovr}</span>
        ${diff != null ? `<span class="report-diff ${diff >= 0 ? 'up' : 'down'}">${diff >= 0 ? '▲ +' + diff : '▼ ' + diff} since last report</span>`
          : '<span class="report-diff">first report</span>'}
      </div>
    </div>

    <div class="grade-cards">
      ${Object.entries(PILLARS).map(([k, pl]) => `
        <div class="grade-card">
          <span class="grade-card-code">${pl.code}</span>
          <span class="grade-card-letter ${ratingClass(piles[k])}">${letterGrade(piles[k])}</span>
          <span class="grade-card-num">${piles[k]}</span>
        </div>`).join('')}
    </div>

    ${prevOvr != null ? `<h3 class="side-title">PROGRESS</h3>${progressChartSVG(p)}` : ''}

    <div class="report-cols">
      <div class="report-col">
        <h3 class="side-title green">🔥 SUPER STRENGTHS</h3>
        ${strengths.map(s => `<div class="report-item">
          <b class="${ratingClass(s.v)}">${s.v}</b><span>${ATTR_META[s.at].label}</span>
          <div class="attr-bar"><div class="attr-fill ${ratingClass(s.v)}" style="width:${s.v}%"></div></div></div>`).join('')}
      </div>
      <div class="report-col">
        <h3 class="side-title gold">🎯 ATTACK THESE NEXT</h3>
        ${weaknesses.map(s => `<div class="report-item">
          <b class="${ratingClass(s.v)}">${s.v}</b><span>${ATTR_META[s.at].label}</span>
          <div class="attr-bar"><div class="attr-fill ${ratingClass(s.v)}" style="width:${s.v}%"></div></div></div>`).join('')}
      </div>
    </div>

    ${improvements.length ? `
      <div class="improve-strip">
        <span class="improve-label">BIGGEST JUMPS</span>
        ${improvements.map(([at, d]) => `<span class="improve-chip">▲${d} ${ATTR_META[at].label}</span>`).join('')}
      </div>` : ''}

    ${a.note ? `
      <div class="coach-note">
        <div class="coach-note-head">🗣️ COACH'S NOTE</div>
        <p>“${escapeHtml(a.note)}”</p>
      </div>` : ''}

    <div class="report-next">
      <p>Your full development plan is ready in <b>🤖 My Plan</b> — drills, videos, daily routine, weekly schedule.</p>
    </div>
  </div>`;
}

/* ── Tab: Plan (qmtk AI Coach) ── */
function planHTML(p, a) {
  const plan = generatePlan(p, a);
  return `
  <div class="plan">
    <div class="ai-head">
      <div class="ai-chip">🤖 QMTK AI COACH <span>BETA</span></div>
      <h2>${escapeHtml(plan.headline)}</h2>
      <p class="ai-summary">${escapeHtml(plan.summary)}</p>
    </div>

    <div class="strength-banner">
      <span>YOUR WEAPON</span>
      <b>${plan.superStrength.label} · ${plan.superStrength.rating}</b>
      Keep feeding it — your plan protects it while attacking the gaps.
    </div>

    <h3 class="side-title">🎯 FOCUS AREAS THIS CYCLE</h3>
    <div class="focus-grid">
      ${plan.focusAreas.map((f, i) => `
        <div class="focus-card">
          <div class="focus-head">
            <span class="focus-rank">№${i + 1}</span>
            <div><b>${f.label}</b><span class="focus-pillar">${PILLARS[f.pillar].icon} ${f.pillarLabel} · currently <i class="${ratingClass(f.rating)}">${f.rating}</i></span></div>
          </div>
          ${f.drills.map(d => `
            <div class="drill">
              <div class="drill-head"><b>${escapeHtml(d.n)}</b>
                <span class="drill-meta">${d.t ? d.t + ' min' : 'game-day task'} · ${escapeHtml(d.eq)}</span></div>
              <p>${escapeHtml(d.d)}</p>
              <div class="drill-cue">💬 ${escapeHtml(d.cue)}</div>
              ${d.v ? `<a class="drill-video" href="${d.v}" target="_blank" rel="noopener">▶ Watch on qmtk Instagram</a>` : ''}
            </div>`).join('')}
        </div>`).join('')}
    </div>

    <h3 class="side-title">📅 YOUR DAILY ROUTINE <span class="hint">(~${plan.daily.reduce((s, d) => s + d.mins, 0)} min — tick them off today)</span></h3>
    <div class="daily-list" id="daily-list">
      ${plan.daily.map((d, i) => `
        <label class="daily-item">
          <input type="checkbox" data-daily="${i}">
          <div><b>${escapeHtml(d.title)}</b><span>${escapeHtml(d.desc)}</span></div>
          <span class="daily-mins">${d.mins}′</span>
        </label>`).join('')}
    </div>

    <h3 class="side-title">🗓️ YOUR WEEK</h3>
    <div class="week-grid">
      ${plan.weekly.map(w => `
        <div class="week-day type-${w.type}">
          <div class="week-day-name">${w.day}</div>
          <b>${escapeHtml(w.title)}</b>
          <ul>${w.items.map(it => `<li>${escapeHtml(it)}</li>`).join('')}</ul>
        </div>`).join('')}
    </div>
    <p class="plan-foot">Plan regenerates from your newest grades — every assessment rewrites your path. 🔁</p>
  </div>`;
}

function bindPlan(p) {
  const key = 'qmtk_daily_' + p.id + '_' + todayISO();
  const saved = JSON.parse(localStorage.getItem(key) || '[]');
  document.querySelectorAll('[data-daily]').forEach(cb => {
    cb.checked = saved.includes(cb.dataset.daily);
    cb.addEventListener('change', () => {
      const now = [...document.querySelectorAll('[data-daily]')].filter(c => c.checked).map(c => c.dataset.daily);
      localStorage.setItem(key, JSON.stringify(now));
    });
  });
}

/* ── Tab: Profile ── */
function profileHTML(p, opts) {
  const style = p.style && STYLES[p.style] ? STYLES[p.style] : null;
  return `
  <div class="profile">
    <h3 class="side-title">⭐ PICK YOUR PLAY STYLE</h3>
    <p class="hint-p">Your style shows on your card and shapes your identity as a player.</p>
    <div class="style-grid">
      ${Object.entries(STYLES).map(([k, s]) => `
        <button class="style-card ${p.style === k ? 'on' : ''}" data-style="${k}">
          <span class="style-icon">${s.icon}</span><b>${s.name}</b><span class="style-tag">${s.tag}</span>
        </button>`).join('')}
    </div>

    <h3 class="side-title">🌟 YOUR PRO COMPARISON</h3>
    <p class="hint-p">Who do you play like? Pick your model pro — study them, steal their habits.</p>
    <div class="pro-row">
      <input id="pro-input" type="text" maxlength="40" placeholder="e.g. ${style ? PRO_MAP[p.style][p.position] || 'Pedri' : 'Pedri'}" value="${escapeHtml(p.pro || '')}">
      <button class="btn btn-ghost" id="pro-suggest">✨ Suggest</button>
      <button class="btn btn-green" id="pro-save">Save</button>
    </div>

    <h3 class="side-title">🥅 MY GOALS</h3>
    <div class="goals" id="goals">
      ${(p.goals || []).map((g, i) => `
        <label class="goal ${g.done ? 'done' : ''}">
          <input type="checkbox" data-goal="${i}" ${g.done ? 'checked' : ''}>
          <span>${escapeHtml(g.text)}</span>
          <button class="goal-del" data-del-goal="${i}">✕</button>
        </label>`).join('')}
    </div>
    <div class="pro-row">
      <input id="goal-input" type="text" maxlength="80" placeholder="e.g. Master my weak foot by August">
      <button class="btn btn-green" id="goal-add">+ Add Goal</button>
    </div>
    <div id="flash" style="margin-top:1rem"></div>
  </div>`;
}

function bindProfile(p, opts) {
  const persist = () => { if (!opts.shared || Store.get(p.id)) Store.upsert(p); };
  document.querySelectorAll('[data-style]').forEach(b => b.addEventListener('click', () => {
    p.style = b.dataset.style;
    persist();
    document.querySelectorAll('[data-style]').forEach(x => x.classList.toggle('on', x === b));
  }));
  document.getElementById('pro-suggest').addEventListener('click', () => {
    const stylePick = p.style || 'maestro';
    document.getElementById('pro-input').value = (PRO_MAP[stylePick] && PRO_MAP[stylePick][p.position]) || 'Pedri';
  });
  document.getElementById('pro-save').addEventListener('click', () => {
    p.pro = document.getElementById('pro-input').value.trim();
    persist();
    flash('Saved — it shows on your card now.');
  });
  document.getElementById('goal-add').addEventListener('click', () => {
    const t = document.getElementById('goal-input').value.trim();
    if (!t) return;
    p.goals = p.goals || [];
    p.goals.push({ text: t, done: false });
    persist();
    document.getElementById('ptab-body').innerHTML = profileHTML(p, opts);
    bindProfile(p, opts);
  });
  document.querySelectorAll('[data-goal]').forEach(cb => cb.addEventListener('change', () => {
    p.goals[parseInt(cb.dataset.goal, 10)].done = cb.checked;
    persist();
    cb.closest('.goal').classList.toggle('done', cb.checked);
  }));
  document.querySelectorAll('[data-del-goal]').forEach(b => b.addEventListener('click', (e) => {
    e.preventDefault();
    p.goals.splice(parseInt(b.dataset.delGoal, 10), 1);
    persist();
    document.getElementById('ptab-body').innerHTML = profileHTML(p, opts);
    bindProfile(p, opts);
  }));
}

/* ── Radar (SVG pentagon) ── */
function radarSVG(piles) {
  const cx = 110, cy = 105, R = 78;
  const keys = Object.keys(PILLARS);
  const pt = (i, r) => {
    const ang = -Math.PI / 2 + i * (2 * Math.PI / 5);
    return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
  };
  const ring = f => keys.map((_, i) => pt(i, R * f).map(n => n.toFixed(1)).join(',')).join(' ');
  const valuePoly = keys.map((k, i) => pt(i, R * (piles[k] / 99)).map(n => n.toFixed(1)).join(',')).join(' ');
  const labels = keys.map((k, i) => {
    const [x, y] = pt(i, R + 16);
    return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" class="radar-label">${PILLARS[k].code}</text>
            <text x="${x.toFixed(1)}" y="${(y + 17).toFixed(1)}" text-anchor="middle" class="radar-num">${piles[k]}</text>`;
  }).join('');
  return `
  <svg viewBox="0 0 220 225" class="radar">
    ${[1, 0.66, 0.33].map(f => `<polygon points="${ring(f)}" class="radar-ring"/>`).join('')}
    ${keys.map((_, i) => { const [x, y] = pt(i, R); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="radar-axis"/>`; }).join('')}
    <polygon points="${valuePoly}" class="radar-value"/>
    ${keys.map((k, i) => { const [x, y] = pt(i, R * (piles[k] / 99)); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" class="radar-dot"/>`; }).join('')}
    ${labels}
  </svg>`;
}

/* ── Progress line chart ── */
function progressChartSVG(p) {
  const pts = p.assessments.map(a => ({ date: a.date, ovr: overallFor(a.grades, p.position) }));
  if (pts.length < 2) return '';
  const W = 560, H = 120, PAD = 28;
  const min = Math.min(...pts.map(x => x.ovr)) - 4, max = Math.max(...pts.map(x => x.ovr)) + 4;
  const X = i => PAD + i * ((W - 2 * PAD) / (pts.length - 1));
  const Y = v => H - PAD - ((v - min) / (max - min)) * (H - 2 * PAD);
  const line = pts.map((x, i) => `${X(i).toFixed(1)},${Y(x.ovr).toFixed(1)}`).join(' ');
  return `
  <svg viewBox="0 0 ${W} ${H + 14}" class="progress-chart">
    <polyline points="${line}" class="chart-line"/>
    ${pts.map((x, i) => `
      <circle cx="${X(i).toFixed(1)}" cy="${Y(x.ovr).toFixed(1)}" r="4" class="chart-dot"/>
      <text x="${X(i).toFixed(1)}" y="${(Y(x.ovr) - 10).toFixed(1)}" text-anchor="middle" class="chart-num">${x.ovr}</text>
      <text x="${X(i).toFixed(1)}" y="${H + 8}" text-anchor="middle" class="chart-date">${fmtDate(x.date)}</text>`).join('')}
  </svg>`;
}

/* ── Card reveal (walkout) ── */
function revealOverlayHTML(p, a) {
  return `
  <div class="reveal-overlay" id="reveal-overlay">
    <div class="reveal-stage">
      <div class="reveal-crest">⚽</div>
      <div class="reveal-flare"></div>
      <div class="reveal-card-slot" id="reveal-card-slot"></div>
      <div class="reveal-skip">tap anywhere to skip</div>
    </div>
  </div>`;
}

function runReveal(p, a, revealKey) {
  const overlay = document.getElementById('reveal-overlay');
  if (!overlay) return;
  const finish = () => {
    sessionStorage.setItem(revealKey, '1');
    overlay.classList.add('reveal-out');
    setTimeout(() => overlay.remove(), 450);
  };
  overlay.addEventListener('click', finish);
  setTimeout(() => {
    const slot = document.getElementById('reveal-card-slot');
    if (!slot) return;
    slot.innerHTML = futCardHTML(p, a, { big: true });
    overlay.classList.add('reveal-show-card');
    // OVR count-up
    const ovrEl = slot.querySelector('.fut-ovr');
    const target = parseInt(ovrEl.dataset.ovr, 10);
    const t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / 900);
      ovrEl.textContent = Math.round(target * (k * (2 - k)));
      if (k < 1) requestAnimationFrame(tick); else ovrEl.textContent = target;
    };
    requestAnimationFrame(tick);
  }, 1100);
  setTimeout(finish, 4200);
}

/* ── Boot ── */
seedDemo();
window.addEventListener('hashchange', route);
route();
