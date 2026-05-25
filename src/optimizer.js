// Machine Learning layer — genetic algorithm to optimize the 7 scoring weights
// Uses known BTC bottom months as labeled training data

export const DEFAULT_WEIGHTS = {
  dev: 30, slope: 20, bounce: 15, duration: 15, tvl: 10, cvd: 10, crash: 15,
};

// Historical confirmed bottoms (labeled data for supervised optimization)
const KNOWN_BOTTOMS = new Set(["Dec 18", "Mar 20", "Jun 22", "Nov 22"]);

const KEYS = ["dev", "slope", "bounce", "duration", "tvl", "cvd", "crash"];
const MAX_W = { dev: 45, slope: 30, bounce: 25, duration: 25, tvl: 20, cvd: 20, crash: 25 };

function buildWithWeights(raw, w) {
  const MA_P = 12;
  const mas = raw.map((_, i) => {
    const win = Math.min(i + 1, MA_P);
    if (win < 3) return null;
    return raw.slice(i - win + 1, i + 1).reduce((s, d) => s + d.p, 0) / win;
  });

  return raw.map((d, i) => {
    const ma = mas[i];
    if (!ma) return { date: d.d, score: 0, zone: "none" };
    const dev = (d.p - ma) / ma * 100;
    let devS = 0, slopeS = 0, momS = 0, durS = 0, tvlS = 0, cvdS = 0, crashS = 0;

    if (dev < 0) {
      let maDeclining = false;
      if (i >= 3 && mas[i - 3] && (mas[i] - mas[i - 3]) / mas[i - 3] * 100 < -3)
        maDeclining = true;

      let inRecovery = false;
      if (i >= 6) {
        const min6 = Math.min(...raw.slice(i - 6, i).map(x => x.p));
        if (min6 > 0 && (d.p - min6) / min6 * 100 > 25) inRecovery = true;
      }

      if (i >= 2) {
        const prevHigh = Math.max(...raw.slice(Math.max(0, i - 2), i).map(x => x.p));
        const drop = prevHigh > 0 ? (d.p - prevHigh) / prevHigh * 100 : 0;
        if (drop < -15) crashS = Math.min(w.crash, Math.round((-drop - 15) * 0.9));
      }

      devS = Math.min(w.dev, Math.round((-dev / 50) * w.dev));
      if (maDeclining) devS = Math.round(devS * 0.7);
      if (inRecovery)  devS = Math.round(devS * 0.3);

      if (i >= 2 && mas[i - 1] && mas[i - 2]) {
        const s1 = (mas[i] - mas[i - 1]) / mas[i - 1];
        const s2 = (mas[i - 1] - mas[i - 2]) / mas[i - 2];
        slopeS = Math.min(w.slope, Math.max(0, Math.round((s1 - s2) * 250 + (s1 < 0 ? 6 : 0))));
        if (maDeclining) slopeS = Math.min(slopeS, 5);
        if (inRecovery)  slopeS = Math.round(slopeS * 0.3);
      }

      if (i >= 4) {
        const win = raw.slice(Math.max(0, i - 6), i + 1).map(x => x.p);
        const localMin = Math.min(...win);
        const bounce = localMin > 0 ? (d.p - localMin) / localMin * 100 : 0;
        momS = Math.min(w.bounce, Math.round(bounce * 1.5));
        if (momS < 5 && i >= 2) {
          const m1 = (d.p - raw[i - 1].p) / raw[i - 1].p * 100;
          const m2 = (raw[i - 1].p - raw[i - 2].p) / raw[i - 2].p * 100;
          if (m2 < -5 && m1 > m2)
            momS = Math.min(w.bounce, momS + Math.round((m1 - m2) * 0.5));
        }
      }

      let dur = 0;
      for (let j = i; j >= 0; j--) {
        if (mas[j] !== null && raw[j].p < mas[j]) dur++; else break;
      }
      durS = Math.min(w.duration, Math.round(dur * 1.7));
      if (inRecovery) durS = Math.round(durS * 0.5);

      if (i >= 3 && d.tvl != null) {
        const tvl3m = raw[i - 3].tvl;
        const tvl6m = raw[Math.max(0, i - 6)].tvl;
        const wasDecline = tvl6m > tvl3m * 1.05;
        const nowRecovering = d.tvl > tvl3m;
        if (wasDecline && nowRecovering) {
          tvlS = Math.min(w.tvl, Math.round((d.tvl - tvl3m) / tvl3m * 100 * 0.8));
        } else if (nowRecovering) {
          tvlS = Math.min(Math.floor(w.tvl / 2), Math.round((d.tvl - tvl3m) / tvl3m * 50));
        } else if (wasDecline) {
          const dropPct = (tvl6m - d.tvl) / tvl6m * 100;
          if (dropPct > 30)
            tvlS = Math.min(Math.floor(w.tvl / 2), Math.round((dropPct - 30) * 0.2));
        }
      }

      if (d.cvd != null && d.cvd > 0) {
        cvdS = Math.min(w.cvd, Math.round(d.cvd / 12));
        if (i >= 1 && raw[i - 1].cvd < 0) cvdS = Math.min(w.cvd, cvdS + 3);
      }
    }

    const total = Math.min(100, devS + slopeS + momS + durS + tvlS + cvdS + crashS);
    const zone = dev >= 0 ? "bull"
      : total >= 50 ? "strong"
      : total >= 35 ? "watch"
      : total >= 15 ? "early"
      : "neutral";
    return { date: d.d, score: total, zone, signal: total >= 50 };
  });
}

// Fitness: maximize bottom scores, minimize noise during non-bottom bear months
function fitness(raw, w) {
  const data = buildWithWeights(raw, w);
  let bSum = 0, bN = 0, nbSum = 0, nbN = 0;
  data.forEach(d => {
    if (KNOWN_BOTTOMS.has(d.date)) { bSum += d.score; bN++; }
    else if (d.zone !== "bull" && d.zone !== "none") { nbSum += d.score; nbN++; }
  });
  return (bN > 0 ? bSum / bN : 0) - (nbN > 0 ? nbSum / nbN : 0) * 0.55;
}

function randomWeights() {
  const w = {};
  KEYS.forEach(k => { w[k] = Math.max(3, Math.round(Math.random() * MAX_W[k])); });
  return w;
}

function mutate(w) {
  const m = { ...w };
  KEYS.forEach(k => {
    if (Math.random() < 0.35) {
      const delta = Math.round((Math.random() - 0.5) * 8);
      m[k] = Math.max(1, Math.min(MAX_W[k], m[k] + delta));
    }
  });
  return m;
}

function crossover(a, b) {
  const c = {};
  KEYS.forEach(k => { c[k] = Math.random() < 0.5 ? a[k] : b[k]; });
  return c;
}

export function runOptimizer(raw) {
  const POP = 60;
  const GENS = 120;
  const baselineFitness = fitness(raw, DEFAULT_WEIGHTS);

  let population = [{ ...DEFAULT_WEIGHTS }, ...Array.from({ length: POP - 1 }, randomWeights)];
  let best = { w: DEFAULT_WEIGHTS, f: baselineFitness };

  for (let g = 0; g < GENS; g++) {
    const scored = population.map(w => ({ w, f: fitness(raw, w) }));
    scored.sort((a, b) => b.f - a.f);
    if (scored[0].f > best.f) best = scored[0];

    const survivors = scored.slice(0, Math.floor(POP / 2)).map(s => s.w);
    population = [...survivors];
    while (population.length < POP) {
      const a = survivors[Math.floor(Math.random() * survivors.length)];
      const b = survivors[Math.floor(Math.random() * survivors.length)];
      population.push(mutate(crossover(a, b)));
    }
  }

  const improvementPct = baselineFitness !== 0
    ? ((best.f - baselineFitness) / Math.abs(baselineFitness) * 100).toFixed(1)
    : "N/A";

  return { weights: best.w, fitness: best.f, baseline: baselineFitness, improvement: improvementPct };
}
