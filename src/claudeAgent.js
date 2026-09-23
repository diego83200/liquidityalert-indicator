// IA Générative + Agentique layers — Claude API for autonomous signal interpretation

export async function analyzeWithClaude(signal, apiKey) {
  if (!apiKey?.trim()) return null;

  const content = `Bitcoin OCM indicator — ${signal.date}
Score: ${signal.score}/100 zone ${signal.zone.toUpperCase()}
Price: $${signal.price?.toLocaleString()} | MA12: $${signal.ma?.toLocaleString()} | Dev: ${signal.dev}%
Components: Dev ${signal.devS}/30 · Slope ${signal.slopeS}/20 · Bounce ${signal.momS}/15 · Duration ${signal.durS}/15 · TVL ${signal.tvlS}/10 · CVD ${signal.cvdS}/10 · Crash ${signal.crashS}/15
TVL: $${signal.tvl}B | CVD: ${signal.cvd}

In 2-3 sentences, what does this signal mean for BTC investors right now? Be direct and actionable. Reply in the same language the user expects (French).`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-calls": "true",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 280,
        messages: [{ role: "user", content }],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.content[0]?.text ?? null;
  } catch (e) {
    return `Erreur: ${e.message}`;
  }
}
