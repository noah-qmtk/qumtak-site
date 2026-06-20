/* ============================================================
   api/score.js — API-Football proxy for the OBS Match HUD.
   Live at https://qmtk.org/api/score

   The OBS HUD (match-hud.html) polls this in AUTO mode and gets
   back score + match minute + stats, already oriented to the
   HUD's home/away teams and the HUD's stat-row labels. CORS open.

   WHY a proxy: API-Football has no browser CORS and the key must
   stay server-side. This function holds the key, finds the live
   fixture for the two teams the HUD is showing, and normalises
   the response.

   ---- SETUP --------------------------------------------------
   1. Free key: https://dashboard.api-football.com  (100 req/day)
   2. Vercel → qumtak-site → Settings → Environment Variables:
        APIFOOTBALL_KEY = <your key>
      then redeploy (or just push — Vercel redeploys).
   3. HUD calls:  /api/score?home=Sweden&away=Netherlands
      Pin a fixture instead:  /api/score?fixture=<id>
      (or env HUD_FIXTURE_ID).  Add &stats=1 for the stat lines.

   ---- FREE-TIER NOTE ----------------------------------------
   100 requests/day. The HUD defaults (poll 120s, stats every 3rd
   poll) spend ~100 calls over a 2.5h match — about one game/day.
   For true 20–30s "instant" refresh, upgrade the plan and lower
   the HUD's AUTO_POLL_MS.
   ============================================================ */

const BASE = "https://v3.football.api-sports.io";

const norm = s => (s||"").toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g,"");
const nameMatch = (a,b) => { a=norm(a); b=norm(b); return !!a && !!b && (a.includes(b)||b.includes(a)); };

const LIVE_SHORT = ["1H","2H","ET","BT","LIVE","INT","P","HT"];
const isLive = short => LIVE_SHORT.includes(short);
function statusPill(short, elapsed){
  if(["1H","2H","ET","LIVE","INT"].includes(short)) return (elapsed!=null ? elapsed+"'" : "LIVE");
  if(short==="HT" || short==="BT") return "HT";
  if(["FT","AET","PEN"].includes(short)) return "FT";
  if(short==="P") return "PEN";
  return ""; // NS, TBD, PST, CANC, ABD, AWD, WO, SUSP
}

// API statistic "type" -> HUD row label (display order). 3rd col = strip "%"
const STAT_MAP = [
  ["Possession",       "Ball Possession", true ],
  ["Total Shots",      "Total Shots",     false],
  ["Shots on Target",  "Shots on Goal",   false],
  ["Corners",          "Corner Kicks",    false],
  ["Total Passes",     "Total passes",    false],
  ["Passing Accuracy", "Passes %",        true ],
  ["Fouls",            "Fouls",           false],
  ["Offsides",         "Offsides",        false]
];
function pick(stats, type){
  const e = (stats||[]).find(s => s.type===type);
  let v = e ? e.value : null;
  if(v==null) return "0";
  if(typeof v === "string") v = v.replace("%","").trim();
  return String(v);
}

async function afGet(path, key){
  const r = await fetch(BASE+path, { headers:{ "x-apisports-key": key } });
  return r.json();
}

export default async function handler(req, res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Cache-Control","no-store");
  if(req.method==="OPTIONS"){ res.status(204).end(); return; }

  const key = process.env.APIFOOTBALL_KEY;
  if(!key){ res.status(200).json({ error:"no_key", note:"Set APIFOOTBALL_KEY in Vercel env" }); return; }

  const q = req.query || {};
  const wantStats = q.stats==="1" || q.stats==="true";
  const pinned = q.fixture || process.env.HUD_FIXTURE_ID;

  try{
    let fx;
    if(pinned){
      fx = ((await afGet(`/fixtures?id=${encodeURIComponent(pinned)}`, key)).response||[])[0];
    }else{
      const list = (await afGet(`/fixtures?live=all`, key)).response || [];
      if(q.home && q.away){
        fx = list.find(f =>
          (nameMatch(f.teams.home.name, q.home) && nameMatch(f.teams.away.name, q.away)) ||
          (nameMatch(f.teams.home.name, q.away) && nameMatch(f.teams.away.name, q.home))
        );
      }
    }
    if(!fx){ res.status(200).json({ found:false }); return; }

    const apiHome = fx.teams.home, apiAway = fx.teams.away;
    // orient API home/away to the HUD's home/away by team name (handles venue reversal)
    let homeIsApiHome = true;
    if(q.home){
      if(nameMatch(apiHome.name, q.home)) homeIsApiHome = true;
      else if(nameMatch(apiAway.name, q.home)) homeIsApiHome = false;
    }
    const gHome = fx.goals.home ?? 0, gAway = fx.goals.away ?? 0;
    const short = fx.fixture.status.short, elapsed = fx.fixture.status.elapsed;
    const ticking = ["1H","2H","ET","LIVE","INT"].includes(short);

    const out = {
      found: true,
      fixture: fx.fixture.id,
      live: isLive(short),
      minute: ticking ? elapsed : null,
      status: statusPill(short, elapsed),
      comp: ((fx.league && fx.league.name) || "").toUpperCase() || undefined,
      home: { score: homeIsApiHome ? gHome : gAway },
      away: { score: homeIsApiHome ? gAway : gHome }
    };

    if(wantStats){
      const arr = (await afGet(`/fixtures/statistics?fixture=${fx.fixture.id}`, key)).response || [];
      let hStats=null, aStats=null;
      for(const t of arr){
        const isHomeTeam = (t.team.id === (homeIsApiHome ? apiHome.id : apiAway.id));
        if(isHomeTeam) hStats = t.statistics; else aStats = t.statistics;
      }
      if(hStats || aStats){
        out.stats = STAT_MAP.map(([label, type]) => ({
          label, home: pick(hStats, type), away: pick(aStats, type)
        }));
      }
    }
    res.status(200).json(out);
  }catch(e){
    res.status(200).json({ error:"fetch_failed", detail:String(e && e.message || e) });
  }
}
