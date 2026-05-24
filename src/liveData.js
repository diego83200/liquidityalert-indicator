// Agentique layer — autonomous live data fetching from public APIs

export async function fetchLiveBTC() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true",
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return {
      price: json.bitcoin.usd,
      change24h: Number(json.bitcoin.usd_24h_change).toFixed(2),
      updatedAt: new Date(json.bitcoin.last_updated_at * 1000),
    };
  } catch {
    return null;
  }
}

export async function fetchLiveTVL() {
  try {
    const res = await fetch("https://api.llama.fi/v2/globalTvl", {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error("empty");
    const latest = data[data.length - 1];
    return {
      tvl: (latest.tvl / 1e9).toFixed(1),
      date: new Date(latest.date * 1000),
    };
  } catch {
    return null;
  }
}
