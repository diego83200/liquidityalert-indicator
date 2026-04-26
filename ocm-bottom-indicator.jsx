import { useState, useMemo } from "react";
import {
  ComposedChart, Line, Area, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, ReferenceLine, ReferenceArea,
} from "recharts";

// ─── BTC Monthly · TVL (Bn$) · CVD (-100→+100) · Jan 2018 – Apr 2026 ──────────
// NOTE 2025-2026: prix = plus hauts mensuels réels (source utilisateur)
// TVL & CVD = estimations. 2018-2024 = prix de clôture mensuels approx.
const RAW = [
  // 2018
  { d:"Jan 18", p:13700, tvl:0.50, cvd:-10 }, { d:"Feb 18", p:9000,  tvl:0.40, cvd:-45 },
  { d:"Mar 18", p:7000,  tvl:0.40, cvd:-55 }, { d:"Apr 18", p:8700,  tvl:0.40, cvd:-15 },
  { d:"May 18", p:7500,  tvl:0.35, cvd:-30 }, { d:"Jun 18", p:6200,  tvl:0.35, cvd:-60 },
  { d:"Jul 18", p:8200,  tvl:0.35, cvd:-10 }, { d:"Aug 18", p:7050,  tvl:0.30, cvd:-35 },
  { d:"Sep 18", p:6620,  tvl:0.30, cvd:-30 }, { d:"Oct 18", p:6350,  tvl:0.30, cvd:-25 },
  { d:"Nov 18", p:4200,  tvl:0.28, cvd:-75 }, { d:"Dec 18", p:3220,  tvl:0.25, cvd:-65 },
  // 2019
  { d:"Jan 19", p:3400,  tvl:0.25, cvd:-5  }, { d:"Feb 19", p:3850,  tvl:0.28, cvd:20  },
  { d:"Mar 19", p:4100,  tvl:0.32, cvd:25  }, { d:"Apr 19", p:5100,  tvl:0.45, cvd:50  },
  { d:"May 19", p:8700,  tvl:0.60, cvd:65  }, { d:"Jun 19", p:10800, tvl:0.75, cvd:70  },
  { d:"Jul 19", p:9600,  tvl:0.70, cvd:25  }, { d:"Aug 19", p:9600,  tvl:0.65, cvd:10  },
  { d:"Sep 19", p:8100,  tvl:0.60, cvd:-15 }, { d:"Oct 19", p:9200,  tvl:0.65, cvd:20  },
  { d:"Nov 19", p:7500,  tvl:0.55, cvd:-30 }, { d:"Dec 19", p:7200,  tvl:0.60, cvd:-15 },
  // 2020
  { d:"Jan 20", p:9400,  tvl:0.85, cvd:30  }, { d:"Feb 20", p:8700,  tvl:0.78, cvd:-20 },
  { d:"Mar 20", p:5500,  tvl:0.60, cvd:-80 }, { d:"Apr 20", p:8600,  tvl:0.80, cvd:40  },
  { d:"May 20", p:9500,  tvl:1.00, cvd:50  }, { d:"Jun 20", p:9100,  tvl:1.50, cvd:30  },
  { d:"Jul 20", p:11400, tvl:2.50, cvd:65  }, { d:"Aug 20", p:11650, tvl:5.00, cvd:70  },
  { d:"Sep 20", p:10800, tvl:10.5, cvd:20  }, { d:"Oct 20", p:13800, tvl:12.0, cvd:60  },
  { d:"Nov 20", p:19700, tvl:15.0, cvd:80  }, { d:"Dec 20", p:28990, tvl:20.0, cvd:85  },
  // 2021
  { d:"Jan 21", p:33100, tvl:26.0, cvd:80  }, { d:"Feb 21", p:45200, tvl:42.0, cvd:90  },
  { d:"Mar 21", p:58900, tvl:58.0, cvd:85  }, { d:"Apr 21", p:57800, tvl:80.0, cvd:65  },
  { d:"May 21", p:35700, tvl:63.0, cvd:-40 }, { d:"Jun 21", p:35000, tvl:54.0, cvd:-20 },
  { d:"Jul 21", p:41500, tvl:68.0, cvd:30  }, { d:"Aug 21", p:47100, tvl:86.0, cvd:60  },
  { d:"Sep 21", p:43800, tvl:92.0, cvd:35  }, { d:"Oct 21", p:60600, tvl:125., cvd:75  },
  { d:"Nov 21", p:57000, tvl:210., cvd:60  }, { d:"Dec 21", p:46300, tvl:250., cvd:-15 },
  // 2022
  { d:"Jan 22", p:38500, tvl:220., cvd:-30 }, { d:"Feb 22", p:43200, tvl:190., cvd:-10 },
  { d:"Mar 22", p:45500, tvl:200., cvd:-15 }, { d:"Apr 22", p:37700, tvl:175., cvd:-45 },
  { d:"May 22", p:29000, tvl:108., cvd:-80 }, { d:"Jun 22", p:19000, tvl:70.0, cvd:-85 },
  { d:"Jul 22", p:23300, tvl:76.0, cvd:-20 }, { d:"Aug 22", p:20050, tvl:64.0, cvd:-40 },
  { d:"Sep 22", p:19400, tvl:54.0, cvd:-50 }, { d:"Oct 22", p:20500, tvl:54.0, cvd:-10 },
  { d:"Nov 22", p:16600, tvl:40.0, cvd:-75 }, { d:"Dec 22", p:16530, tvl:39.0, cvd:-45 },
  // 2023
  { d:"Jan 23", p:23100, tvl:45.0, cvd:30  }, { d:"Feb 23", p:23400, tvl:48.0, cvd:20  },
  { d:"Mar 23", p:28500, tvl:53.0, cvd:45  }, { d:"Apr 23", p:29300, tvl:55.0, cvd:35  },
  { d:"May 23", p:27700, tvl:50.0, cvd:10  }, { d:"Jun 23", p:30500, tvl:56.0, cvd:25  },
  { d:"Jul 23", p:29300, tvl:53.0, cvd:15  }, { d:"Aug 23", p:26000, tvl:47.0, cvd:-20 },
  { d:"Sep 23", p:26900, tvl:47.0, cvd:-15 }, { d:"Oct 23", p:34500, tvl:56.0, cvd:40  },
  { d:"Nov 23", p:37900, tvl:62.0, cvd:55  }, { d:"Dec 23", p:42600, tvl:70.0, cvd:60  },
  // 2024
  { d:"Jan 24", p:42500, tvl:66.0, cvd:50  }, { d:"Feb 24", p:61200, tvl:82.0, cvd:75  },
  { d:"Mar 24", p:71200, tvl:96.0, cvd:80  }, { d:"Apr 24", p:60000, tvl:84.0, cvd:-20 },
  { d:"May 24", p:67500, tvl:91.0, cvd:30  }, { d:"Jun 24", p:62500, tvl:80.0, cvd:-10 },
  { d:"Jul 24", p:66000, tvl:83.0, cvd:20  }, { d:"Aug 24", p:59000, tvl:74.0, cvd:-30 },
  { d:"Sep 24", p:63900, tvl:79.0, cvd:10  }, { d:"Oct 24", p:72300, tvl:86.0, cvd:40  },
  { d:"Nov 24", p:97800, tvl:118., cvd:85  }, { d:"Dec 24", p:93500, tvl:125., cvd:70  },
  // 2025-2026 — clôtures mensuelles réelles
  { d:"Jan 25", p:102373, tvl:138., cvd:60  }, { d:"Feb 25", p:84299,  tvl:118., cvd:10  },
  { d:"Mar 25", p:82517,  tvl:112., cvd:-15 }, { d:"Apr 25", p:94126,  tvl:120., cvd:20  },
  { d:"May 25", p:104540, tvl:148., cvd:60  }, { d:"Jun 25", p:107105, tvl:155., cvd:45  },
  { d:"Jul 25", p:115707, tvl:172., cvd:65  }, { d:"Aug 25", p:108208, tvl:162., cvd:30  },
  { d:"Sep 25", p:113995, tvl:170., cvd:50  }, { d:"Oct 25", p:109555, tvl:165., cvd:20  },
  { d:"Nov 25", p:90327,  tvl:140., cvd:-35 }, { d:"Dec 25", p:87624,  tvl:132., cvd:-45 },
  { d:"Jan 26", p:78698,  tvl:118., cvd:-50 }, { d:"Feb 26", p:66932,  tvl:88.0, cvd:-72 },
  { d:"Mar 26", p:68237,  tvl:82.0, cvd:-60 }, { d:"Apr 26", p:77559,  tvl:88.0, cvd:-30 },
];

// ─── Indicator Engine ─────────────────────────────────────────────────────────
// Scoring v4: devS/30 · slopeS/20 · momS/15 · durS/15 · tvlS/10 · cvdS/10 · crashS/15
// v4 changes: flash-crash velocity (+15 pts), filtre recovery (>25% depuis creux 6m),
//             filtre MA en descente rapide (slope 3m < -3%), seuil 55→50 (5/5 cycles)
function buildOCM(raw) {
  const MA_P = 12;

  const mas = raw.map((_, i) => {
    const window = Math.min(i + 1, MA_P);
    if (window < 3) return null;
    const sum = raw.slice(i - window + 1, i + 1).reduce((s, d) => s + d.p, 0);
    return sum / window;
  });

  return raw.map((d, i) => {
    const ma = mas[i];
    if (!ma) return {
      date: d.d, price: d.p, tvl: d.tvl, cvd: d.cvd,
      ma: null, score: 0,
      devS: 0, slopeS: 0, momS: 0, durS: 0, tvlS: 0, cvdS: 0, crashS: 0,
      zone: "none", signal: false,
    };

    const dev = (d.p - ma) / ma * 100;
    let devS = 0, slopeS = 0, momS = 0, durS = 0, tvlS = 0, cvdS = 0, crashS = 0;

    if (dev < 0) {

      // ─── Pré-filtre A : MA12 encore en chute rapide (3 mois) ──────────────
      let maDeclining = false;
      if (i >= 3 && mas[i - 3]) {
        const slope3m = (mas[i] - mas[i - 3]) / mas[i - 3] * 100;
        if (slope3m < -3) maDeclining = true;
      }

      // ─── Pré-filtre B : prix déjà rebondi >25% depuis creux 6 mois ────────
      let inRecovery = false;
      if (i >= 6) {
        const min6 = Math.min(...raw.slice(i - 6, i).map(x => x.p));
        if (min6 > 0 && (d.p - min6) / min6 * 100 > 25) inRecovery = true;
      }

      // ─── ⑦ Flash crash velocity (0–15 pts) — calculé en premier ──────────
      if (i >= 2) {
        const prevHigh = Math.max(...raw.slice(Math.max(0, i - 2), i).map(x => x.p));
        const drop = prevHigh > 0 ? (d.p - prevHigh) / prevHigh * 100 : 0;
        if (drop < -15) crashS = Math.min(15, Math.round((-drop - 15) * 0.9));
      }

      // ① Deviation depth (0–30 pts)
      devS = Math.min(30, Math.round((-dev / 50) * 30));
      if (maDeclining) devS = Math.round(devS * 0.7);
      if (inRecovery)  devS = Math.round(devS * 0.3);

      // ② MA slope deceleration (0–20 pts)
      if (i >= 2 && mas[i - 1] && mas[i - 2]) {
        const s1 = (mas[i] - mas[i - 1]) / mas[i - 1];
        const s2 = (mas[i - 1] - mas[i - 2]) / mas[i - 2];
        const improvement = s1 - s2;
        const base = s1 < 0 ? 6 : 0;
        slopeS = Math.min(20, Math.max(0, Math.round(improvement * 250 + base)));
        if (maDeclining) slopeS = Math.min(slopeS, 5);
        if (inRecovery)  slopeS = Math.round(slopeS * 0.3);
      }

      // ③ Bounce + stabilization (0–15 pts)
      if (i >= 4) {
        const win = raw.slice(Math.max(0, i - 6), i + 1).map(x => x.p);
        const localMin = Math.min(...win);
        const bounce = localMin > 0 ? (d.p - localMin) / localMin * 100 : 0;
        momS = Math.min(15, Math.round(bounce * 1.5));

        if (momS < 5 && i >= 2) {
          const m1 = (d.p - raw[i - 1].p) / raw[i - 1].p * 100;
          const m2 = (raw[i - 1].p - raw[i - 2].p) / raw[i - 2].p * 100;
          if (m2 < -5 && m1 > m2) {
            momS = Math.min(15, momS + Math.round((m1 - m2) * 0.5));
          }
        }
      }

      // ④ Consecutive months below MA (0–15 pts)
      let dur = 0;
      for (let j = i; j >= 0; j--) {
        if (mas[j] !== null && raw[j].p < mas[j]) dur++;
        else break;
      }
      durS = Math.min(15, Math.round(dur * 1.7));
      if (inRecovery) durS = Math.round(durS * 0.5);

      // ⑤ TVL Signal (0–10 pts)
      if (i >= 3 && d.tvl != null) {
        const tvl3m = raw[i - 3].tvl;
        const tvl6m = raw[Math.max(0, i - 6)].tvl;
        const wasDecline = tvl6m > tvl3m * 1.05;
        const nowRecovering = d.tvl > tvl3m;

        if (wasDecline && nowRecovering) {
          const recovPct = (d.tvl - tvl3m) / tvl3m * 100;
          tvlS = Math.min(10, Math.round(recovPct * 0.8));
        } else if (nowRecovering) {
          tvlS = Math.min(5, Math.round((d.tvl - tvl3m) / tvl3m * 50));
        } else if (wasDecline) {
          const dropPct = (tvl6m - d.tvl) / tvl6m * 100;
          if (dropPct > 30) tvlS = Math.min(5, Math.round((dropPct - 30) * 0.2));
        }
      }

      // ⑥ CVD Signal (0–10 pts)
      if (d.cvd != null && d.cvd > 0) {
        cvdS = Math.min(10, Math.round(d.cvd / 12));
        if (i >= 1 && raw[i - 1].cvd < 0) cvdS = Math.min(10, cvdS + 3);
      }
    }

    const total = Math.min(100, devS + slopeS + momS + durS + tvlS + cvdS + crashS);
    let zone = "none";
    if (dev >= 0)        zone = "bull";
    else if (total >= 50) zone = "strong";
    else if (total >= 35) zone = "watch";
    else if (total >= 15) zone = "early";
    else                  zone = "neutral";

    return {
      date: d.d, price: d.p,
      tvl: d.tvl, cvd: d.cvd,
      ma: Math.round(ma),
      dev: Math.round(dev * 10) / 10,
      score: total,
      devS, slopeS, momS, durS, tvlS, cvdS, crashS,
      zone,
      signal: total >= 50,
    };
  });
}

// ─── Colors ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#04080f", surface: "#070d1a", border: "#0f2040", borderMid: "#1a3a5c",
  cyan: "#00d4ff", green: "#00ff88", amber: "#ffaa00", orange: "#ff6b35",
  blue: "#4a9eff", purple: "#9b6fff", teal: "#00ffcc", pink: "#ff6b9d",
  text: "#c8d6e5", muted: "#3a5a7a", mutedDark: "#1a3050",
};

const ZONE_BG = {
  bull:    "rgba(0,255,136,0.06)",
  strong:  "rgba(0,255,136,0.13)",
  watch:   "rgba(255,170,0,0.11)",
  early:   "rgba(255,107,53,0.08)",
  neutral: "transparent",
  none:    "transparent",
};

function scoreColor(s) {
  if (s >= 55) return C.green;
  if (s >= 35) return C.amber;
  if (s >= 15) return C.orange;
  return C.mutedDark;
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={{
      background: "#07111f", border: `1px solid ${C.borderMid}`,
      borderRadius: 6, padding: "10px 14px",
      fontFamily: "monospace", fontSize: 11, minWidth: 180,
    }}>
      <div style={{ color: C.cyan, marginBottom: 6, letterSpacing: 1 }}>{d.date}</div>
      <div style={{ color: C.text }}>Price: <span style={{ color: "#fff", fontWeight: "bold" }}>${d.price?.toLocaleString()}</span></div>
      {d.ma && <div style={{ color: C.text }}>MA12:  <span style={{ color: C.cyan }}>${d.ma?.toLocaleString()}</span></div>}
      {d.ma && <div style={{ color: C.text }}>Dev:   <span style={{ color: d.dev < 0 ? C.orange : C.green }}>{d.dev > 0 ? "+" : ""}{d.dev}%</span></div>}
      {d.tvl != null && <div style={{ color: C.text }}>TVL:   <span style={{ color: C.teal }}>${d.tvl?.toFixed(1)}B</span></div>}
      {d.cvd != null && <div style={{ color: C.text }}>CVD:   <span style={{ color: d.cvd >= 0 ? C.green : C.orange }}>{d.cvd > 0 ? "+" : ""}{d.cvd}</span></div>}
      {d.score > 0 && (
        <>
          <div style={{ borderTop: `1px solid ${C.border}`, margin: "6px 0" }} />
          <div style={{ color: C.text }}>Score: <span style={{ color: scoreColor(d.score), fontWeight: "bold" }}>{d.score}/100</span></div>
          <div style={{ color: C.muted }}>Dev  {d.devS}/30 · Slope {d.slopeS}/20</div>
          <div style={{ color: C.muted }}>Bnce {d.momS}/15 · Dur   {d.durS}/15</div>
          <div style={{ color: C.muted }}>TVL  {d.tvlS}/10 · CVD   {d.cvdS}/10</div>
          {d.crashS > 0 && <div style={{ color: C.orange }}>Crash {d.crashS}/15 ⚡</div>}
        </>
      )}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function Stat({ label, value, color }) {
  return (
    <div style={{ background: C.surface, borderRight: `1px solid ${C.border}`, padding: "10px 14px", flex: 1, minWidth: 80 }}>
      <div style={{ fontSize: 9, color: C.muted, letterSpacing: 3, marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 13, color: color || C.text, fontWeight: "bold", fontFamily: "monospace" }}>{value}</div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OCMBottomIndicator() {
  const [tab, setTab] = useState("price");
  const data = useMemo(() => buildOCM(RAW), []);
  const latest = data[data.length - 1];
  const signals = data.filter(d => d.signal);

  // Groupes de zones consécutives pour les fonds colorés
  const zoneGroups = useMemo(() => {
    if (!data.length) return [];
    const groups = [];
    let cur = data[0].zone, start = data[0].date;
    for (let i = 1; i < data.length; i++) {
      if (data[i].zone !== cur) {
        groups.push({ zone: cur, x1: start, x2: data[i - 1].date });
        cur = data[i].zone;
        start = data[i].date;
      }
    }
    groups.push({ zone: cur, x1: start, x2: data[data.length - 1].date });
    return groups;
  }, [data]);

  const zoneLabel = {
    strong:  "▲ BOTTOM SIGNAL",
    watch:   "◈ WATCH ZONE",
    early:   "◌ EARLY SIGNAL",
    bull:    "— BULL MARKET",
    neutral: "— NO SIGNAL",
    none:    "— LOADING",
  }[latest.zone] ?? "—";

  const zoneColor = {
    strong: C.green, watch: C.amber, early: C.orange,
    bull: C.blue, neutral: C.muted, none: C.muted,
  }[latest.zone] ?? C.muted;

  const tabs = ["price", "score", "breakdown", "tvl"];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "monospace" }}>

      {/* ── Header ── */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 9, color: C.muted, letterSpacing: 4, textTransform: "uppercase", marginBottom: 4 }}>
            LiquidityAlert · OpenClaw Master v4
          </div>
          <div style={{ fontSize: 18, color: C.cyan, letterSpacing: 2, fontWeight: "bold" }}>
            OCM CYCLE BOTTOM COMPOSITE
          </div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
            MA12 · Deviation · Slope · Bounce · Duration · TVL Recovery · CVD Signal
          </div>
        </div>
        <div style={{
          background: latest.score >= 55 ? "#001810" : latest.score >= 35 ? "#1a1200" : "#0a1628",
          border: `1px solid ${zoneColor}`, borderRadius: 8,
          padding: "12px 20px", textAlign: "center", minWidth: 130,
        }}>
          <div style={{ fontSize: 9, color: C.muted, letterSpacing: 2, marginBottom: 4 }}>CURRENT · APR 2026</div>
          <div style={{ fontSize: 36, color: zoneColor, fontWeight: "bold", lineHeight: 1 }}>{latest.score}</div>
          <div style={{ fontSize: 9, color: zoneColor, letterSpacing: 2, marginTop: 4 }}>{zoneLabel}</div>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, overflowX: "auto" }}>
        <Stat label="PRICE"      value={`$${latest.price?.toLocaleString()}`} />
        <Stat label="MA12"       value={latest.ma ? `$${latest.ma?.toLocaleString()}` : "—"} color={C.cyan} />
        <Stat label="DEVIATION"  value={latest.ma ? `${latest.dev > 0 ? "+" : ""}${latest.dev}%` : "—"} color={latest.dev < 0 ? C.orange : C.green} />
        <Stat label="TVL"        value={latest.tvl != null ? `$${latest.tvl}B` : "—"} color={C.teal} />
        <Stat label="CVD"        value={latest.cvd != null ? `${latest.cvd > 0 ? "+" : ""}${latest.cvd}` : "—"} color={latest.cvd >= 0 ? C.green : C.orange} />
        <Stat label="DEV /30"    value={`${latest.devS}`}   color={C.blue} />
        <Stat label="SLOPE /20"  value={`${latest.slopeS}`} color={C.purple} />
        <Stat label="BOUNCE /15" value={`${latest.momS}`}   color={C.amber} />
        <Stat label="DUR /15"    value={`${latest.durS}`}   color={C.cyan} />
        <Stat label="TVL /10"    value={`${latest.tvlS}`}   color={C.teal} />
        <Stat label="CVD /10"    value={`${latest.cvdS}`}   color={C.pink} />
        <Stat label="CRASH /15"  value={`${latest.crashS}`} color={C.orange} />
        <Stat label="SIGNALS"    value={`${signals.length} detected`} color={C.green} />
      </div>

      {/* ── Tab Nav ── */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "10px 20px", fontFamily: "monospace", fontSize: 10,
            letterSpacing: 2, textTransform: "uppercase",
            color: tab === t ? C.cyan : C.muted,
            borderBottom: tab === t ? `2px solid ${C.cyan}` : "2px solid transparent",
          }}>
            {t === "price" ? "PRICE + MA12" : t === "score" ? "COMPOSITE SCORE" : t === "breakdown" ? "DECOMPOSITION" : "TVL + CVD"}
          </button>
        ))}
      </div>

      {/* ── Charts ── */}
      <div style={{ padding: "20px 16px" }}>

        {/* PRICE CHART */}
        {tab === "price" && (
          <>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: 3, marginBottom: 14 }}>
              PRICE (LOG) · MA12 · ZONES · ▲ BOTTOM SIGNALS (score ≥ 50)
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="2 4" stroke={C.border} />
                <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 9 }} interval={7} />
                <YAxis scale="log" domain={["auto", "auto"]}
                  tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
                  tick={{ fill: C.muted, fontSize: 9 }} />
                <Tooltip content={<CustomTooltip />} />
                {/* Fonds colorés par zone */}
                {zoneGroups.map((g, i) =>
                  g.zone !== "neutral" && g.zone !== "none" ? (
                    <ReferenceArea key={i} x1={g.x1} x2={g.x2}
                      fill={ZONE_BG[g.zone]} strokeOpacity={0} />
                  ) : null
                )}
                {data.filter(d => d.signal).map((d, i) => (
                  <ReferenceLine key={i} x={d.date} stroke={C.green} strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
                ))}
                <Area type="monotone" dataKey="price" stroke={C.blue} strokeWidth={1.5}
                  fill="#0d1f3c" fillOpacity={0.5}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (!payload?.signal) return null;
                    return <circle key={`sig-${cx}`} cx={cx} cy={cy} r={5} fill={C.green} stroke="#001810" strokeWidth={2} />;
                  }}
                />
                <Line type="monotone" dataKey="ma" stroke={C.cyan} strokeWidth={2} dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
            {/* Légende zones */}
            <div style={{ display: "flex", gap: 20, marginTop: 10, marginBottom: 16, flexWrap: "wrap" }}>
              {[
                { color: ZONE_BG.bull,    border: C.green,  label: "BULL — au-dessus MA12" },
                { color: ZONE_BG.early,   border: C.orange, label: "EARLY — score 15–35" },
                { color: ZONE_BG.watch,   border: C.amber,  label: "WATCH — score 35–50" },
                { color: ZONE_BG.strong,  border: C.green,  label: "SIGNAL — score ≥50" },
              ].map((l, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 12, height: 12, background: l.color, border: `1px solid ${l.border}`, borderRadius: 2, opacity: 0.9 }} />
                  <span style={{ fontSize: 9, color: C.muted, letterSpacing: 1 }}>{l.label}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: 9, color: C.muted, letterSpacing: 3, marginBottom: 10 }}>SIGNAUX DÉTECTÉS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {signals.map((s, i) => (
                  <div key={i} style={{
                    background: "#001810", border: `1px solid ${C.green}`,
                    borderRadius: 4, padding: "5px 12px", fontSize: 11,
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <span style={{ color: C.green }}>▲</span>
                    <span style={{ color: C.text }}>{s.date}</span>
                    <span style={{ color: C.muted }}>Score: {s.score}</span>
                    <span style={{ color: "#3a5a3a" }}>${s.price?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* SCORE CHART */}
        {tab === "score" && (
          <>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: 3, marginBottom: 14 }}>
              OCM COMPOSITE SCORE v4 (0–100) · WATCH=35 · SIGNAL=50
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="2 4" stroke={C.border} vertical={false} />
                <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 9 }} interval={7} />
                <YAxis domain={[0, 100]} tick={{ fill: C.muted, fontSize: 9 }} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={50} stroke={C.green} strokeDasharray="4 3" strokeWidth={1} opacity={0.7}
                  label={{ value: "BOTTOM", fill: C.green, fontSize: 9, position: "insideTopRight" }} />
                <ReferenceLine y={35} stroke={C.amber} strokeDasharray="4 3" strokeWidth={1} opacity={0.6}
                  label={{ value: "WATCH", fill: C.amber, fontSize: 9, position: "insideTopRight" }} />
                <Bar dataKey="score" radius={[2, 2, 0, 0]} maxBarSize={12}>
                  {data.map((d, i) => (
                    <Cell key={i} fill={scoreColor(d.score)} opacity={d.score > 0 ? 1 : 0.2} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: 20, marginTop: 16, justifyContent: "center", flexWrap: "wrap" }}>
              {[
                { color: C.green, label: "SIGNAL FORT ≥50" },
                { color: C.amber, label: "WATCH ZONE ≥35" },
                { color: C.orange, label: "EARLY SIGNAL ≥15" },
                { color: C.mutedDark, label: "NO SIGNAL" },
              ].map((l, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{ width: 12, height: 12, background: l.color, borderRadius: 2 }} />
                  <span style={{ fontSize: 10, color: C.muted }}>{l.label}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* BREAKDOWN CHART */}
        {tab === "breakdown" && (
          <>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: 3, marginBottom: 14 }}>
              DÉCOMPOSITION DU SCORE · 6 COMPOSANTES EMPILÉES
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="2 4" stroke={C.border} vertical={false} />
                <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 9 }} interval={7} />
                <YAxis domain={[0, 100]} tick={{ fill: C.muted, fontSize: 9 }} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={50} stroke={C.green} strokeDasharray="3 3" strokeWidth={1} opacity={0.5} />
                <Bar dataKey="devS"   stackId="a" fill={C.blue}   maxBarSize={12} />
                <Bar dataKey="slopeS" stackId="a" fill={C.purple} maxBarSize={12} />
                <Bar dataKey="momS"   stackId="a" fill={C.amber}  maxBarSize={12} />
                <Bar dataKey="durS"   stackId="a" fill={C.cyan}   maxBarSize={12} />
                <Bar dataKey="tvlS"   stackId="a" fill={C.teal}   maxBarSize={12} />
                <Bar dataKey="cvdS"   stackId="a" fill={C.pink}   maxBarSize={12} />
                <Bar dataKey="crashS" stackId="a" fill={C.orange} maxBarSize={12} radius={[2, 2, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: 16, marginTop: 16, justifyContent: "center", flexWrap: "wrap" }}>
              {[
                { color: C.blue,   label: "Deviation /30",  desc: "Profondeur sous MA12" },
                { color: C.purple, label: "Slope /20",      desc: "Décélération de la MA" },
                { color: C.amber,  label: "Bounce /15",     desc: "Rebond depuis le creux local" },
                { color: C.cyan,   label: "Duration /15",   desc: "Mois consécutifs sous MA12" },
                { color: C.teal,   label: "TVL Recovery /10", desc: "Reprise du capital institutionnel" },
                { color: C.pink,   label: "CVD Signal /10", desc: "Pression acheteuse nette" },
                { color: C.orange, label: "Flash Crash /15", desc: "Chute brutale > 15% en 2 mois" },
              ].map((l, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 12, height: 12, background: l.color, borderRadius: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 10, color: C.text }}>{l.label}</div>
                    <div style={{ fontSize: 9, color: C.muted }}>{l.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* TVL + CVD CHART */}
        {tab === "tvl" && (
          <>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: 3, marginBottom: 14 }}>
              TVL (Bn$) · FLUX INSTITUTIONNELS + CVD · PRESSION ACHETEUSE NETTE
            </div>
            {/* TVL Chart */}
            <div style={{ fontSize: 9, color: C.teal, letterSpacing: 2, marginBottom: 8 }}>TVL TOTAL (MILLIARDS $)</div>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="2 4" stroke={C.border} />
                <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 9 }} interval={7} />
                <YAxis tickFormatter={v => `$${v}B`} tick={{ fill: C.muted, fontSize: 9 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="tvl" stroke={C.teal} strokeWidth={1.5}
                  fill="#001a15" fillOpacity={0.6} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
            {/* CVD Chart */}
            <div style={{ fontSize: 9, color: C.pink, letterSpacing: 2, margin: "16px 0 8px" }}>CVD — PRESSION ACHETEUSE NETTE</div>
            <ResponsiveContainer width="100%" height={160}>
              <ComposedChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="2 4" stroke={C.border} vertical={false} />
                <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 9 }} interval={7} />
                <YAxis domain={[-100, 100]} tick={{ fill: C.muted, fontSize: 9 }} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke={C.muted} strokeWidth={1} />
                <Bar dataKey="cvd" maxBarSize={10} radius={[2, 2, 0, 0]}>
                  {data.map((d, i) => (
                    <Cell key={i} fill={d.cvd >= 0 ? C.green : C.orange} opacity={0.8} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      {/* ── Formula Card ── */}
      <div style={{ margin: "0 16px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "16px 20px" }}>
        <div style={{ fontSize: 9, color: C.muted, letterSpacing: 3, marginBottom: 12 }}>FORMULE v4 · OCM CYCLE BOTTOM COMPOSITE — BACKTESTÉ 5/5 CYCLES (2018-2026)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
          {[
            { n: "①", c: C.blue,   t: "Deviation /30",     f: "min(30, (-dev% / 50) × 30)",      d: "Profondeur sous la MA12 — plus le prix est bas, plus le score monte." },
            { n: "②", c: C.purple, t: "Slope /20",          f: "Δpente MA × 250 + base(6)",        d: "Décélération de la MA12 = signal de retournement proche." },
            { n: "③", c: C.amber,  t: "Bounce /15",         f: "min(15, rebond%×1.5 + stab_bonus)", d: "Rebond ou décélération du déclin = capitulation terminée. v3: bonus stabilisation." },
            { n: "④", c: C.cyan,   t: "Duration /15",       f: "min(15, mois × 1.7)",              d: "Mois consécutifs sous MA12 = épuisement du cycle baissier." },
            { n: "⑤", c: C.teal,   t: "TVL Signal /10",     f: "reprise×0.8 ou drop>30%×0.2",     d: "v3: TVL en reprise = capital revenant. Chute TVL >30% = capitulation confirmée." },
            { n: "⑥", c: C.pink,   t: "CVD Signal /10",     f: "min(10, cvd/12 + bonus_retour)",   d: "CVD positif aux creux = pression acheteuse nette des institutions." },
          ].map((comp, i) => (
            <div key={i} style={{ background: "#04080f", borderRadius: 6, padding: "10px 12px", borderLeft: `3px solid ${comp.c}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <span style={{ color: comp.c, fontSize: 14 }}>{comp.n}</span>
                <span style={{ color: comp.c, fontSize: 10, fontWeight: "bold" }}>{comp.t}</span>
              </div>
              <div style={{ fontSize: 9, color: "#7a9abf", fontStyle: "italic", marginBottom: 5, background: "#070d1a", padding: "2px 6px", borderRadius: 3 }}>
                {comp.f}
              </div>
              <div style={{ fontSize: 9, color: C.muted }}>{comp.d}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, padding: "10px 14px", background: "#04080f", borderRadius: 6, border: `1px solid ${C.green}22` }}>
          <span style={{ color: C.green, fontSize: 10 }}>SIGNAL FINAL v4: </span>
          <span style={{ color: C.text, fontSize: 10 }}> Score = ①+②+③+④+⑤+⑥+⑦ ∈ [0,100] · Signal actif si </span>
          <span style={{ color: C.green, fontSize: 10 }}>score ≥ 50</span>
          <span style={{ color: C.muted, fontSize: 10 }}> · Watch ≥ 35 · Early ≥ 15 · Lagging confirmator (1–3 mois après creux)</span>
        </div>
      </div>

    </div>
  );
}
