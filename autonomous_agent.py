#!/usr/bin/env python3
"""
LiquidityAlert — Système Multi-Agents Autonome
Basé sur "Créer des Multi-Agents sur Claude en 5 étapes"

Architecture:
  Orchestrateur → [Agent Données] → [Agent Analyse] → [Agent Signal] → [Agent Rapport]
  Communication: filesystem partagé (projet_partage/)

Usage:
  python autonomous_agent.py                  # Analyse complète
  python autonomous_agent.py --watch 3600     # Mode surveillance (toutes les 3600s)
  python autonomous_agent.py --agent donnees  # Lancer un seul agent
"""

import os
import sys
import json
import time
import logging
import argparse
import requests
from datetime import datetime
from pathlib import Path

try:
    import anthropic
except ImportError:
    print("Installer: pip install anthropic requests")
    sys.exit(1)

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE = Path(__file__).parent
SHARED = BASE / "projet_partage"
LOGS = BASE / "logs"
for d in ["01_brief", "02_donnees", "03_travail", "04_validations", "05_livrables"]:
    (SHARED / d).mkdir(parents=True, exist_ok=True)
LOGS.mkdir(exist_ok=True)

# ─── Logging ──────────────────────────────────────────────────────────────────
def get_logger(name: str) -> logging.Logger:
    log = logging.getLogger(name)
    log.setLevel(logging.INFO)
    if not log.handlers:
        fh = logging.FileHandler(LOGS / f"{name}.log", encoding="utf-8")
        fh.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
        log.addHandler(fh)
        sh = logging.StreamHandler()
        sh.setFormatter(logging.Formatter(f"\033[36m[{name.upper()}]\033[0m %(message)s"))
        log.addHandler(sh)
    return log

# ─── Historical BTC Data (Jan 2018 → Apr 2026) ────────────────────────────────
RAW = [
    {"d":"Jan 18","p":13700,"tvl":0.50,"cvd":-10},{"d":"Feb 18","p":9000,"tvl":0.40,"cvd":-45},
    {"d":"Mar 18","p":7000,"tvl":0.40,"cvd":-55},{"d":"Apr 18","p":8700,"tvl":0.40,"cvd":-15},
    {"d":"May 18","p":7500,"tvl":0.35,"cvd":-30},{"d":"Jun 18","p":6200,"tvl":0.35,"cvd":-60},
    {"d":"Jul 18","p":8200,"tvl":0.35,"cvd":-10},{"d":"Aug 18","p":7050,"tvl":0.30,"cvd":-35},
    {"d":"Sep 18","p":6620,"tvl":0.30,"cvd":-30},{"d":"Oct 18","p":6350,"tvl":0.30,"cvd":-25},
    {"d":"Nov 18","p":4200,"tvl":0.28,"cvd":-75},{"d":"Dec 18","p":3220,"tvl":0.25,"cvd":-65},
    {"d":"Jan 19","p":3400,"tvl":0.25,"cvd":-5},{"d":"Feb 19","p":3850,"tvl":0.28,"cvd":20},
    {"d":"Mar 19","p":4100,"tvl":0.32,"cvd":25},{"d":"Apr 19","p":5100,"tvl":0.45,"cvd":50},
    {"d":"May 19","p":8700,"tvl":0.60,"cvd":65},{"d":"Jun 19","p":10800,"tvl":0.75,"cvd":70},
    {"d":"Jul 19","p":9600,"tvl":0.70,"cvd":25},{"d":"Aug 19","p":9600,"tvl":0.65,"cvd":10},
    {"d":"Sep 19","p":8100,"tvl":0.60,"cvd":-15},{"d":"Oct 19","p":9200,"tvl":0.65,"cvd":20},
    {"d":"Nov 19","p":7500,"tvl":0.55,"cvd":-30},{"d":"Dec 19","p":7200,"tvl":0.60,"cvd":-15},
    {"d":"Jan 20","p":9400,"tvl":0.85,"cvd":30},{"d":"Feb 20","p":8700,"tvl":0.78,"cvd":-20},
    {"d":"Mar 20","p":5500,"tvl":0.60,"cvd":-80},{"d":"Apr 20","p":8600,"tvl":0.80,"cvd":40},
    {"d":"May 20","p":9500,"tvl":1.00,"cvd":50},{"d":"Jun 20","p":9100,"tvl":1.50,"cvd":30},
    {"d":"Jul 20","p":11400,"tvl":2.50,"cvd":65},{"d":"Aug 20","p":11650,"tvl":5.00,"cvd":70},
    {"d":"Sep 20","p":10800,"tvl":10.5,"cvd":20},{"d":"Oct 20","p":13800,"tvl":12.0,"cvd":60},
    {"d":"Nov 20","p":19700,"tvl":15.0,"cvd":80},{"d":"Dec 20","p":28990,"tvl":20.0,"cvd":85},
    {"d":"Jan 21","p":33100,"tvl":26.0,"cvd":80},{"d":"Feb 21","p":45200,"tvl":42.0,"cvd":90},
    {"d":"Mar 21","p":58900,"tvl":58.0,"cvd":85},{"d":"Apr 21","p":57800,"tvl":80.0,"cvd":65},
    {"d":"May 21","p":35700,"tvl":63.0,"cvd":-40},{"d":"Jun 21","p":35000,"tvl":54.0,"cvd":-20},
    {"d":"Jul 21","p":41500,"tvl":68.0,"cvd":30},{"d":"Aug 21","p":47100,"tvl":86.0,"cvd":60},
    {"d":"Sep 21","p":43800,"tvl":92.0,"cvd":35},{"d":"Oct 21","p":60600,"tvl":125.,"cvd":75},
    {"d":"Nov 21","p":57000,"tvl":210.,"cvd":60},{"d":"Dec 21","p":46300,"tvl":250.,"cvd":-15},
    {"d":"Jan 22","p":38500,"tvl":220.,"cvd":-30},{"d":"Feb 22","p":43200,"tvl":190.,"cvd":-10},
    {"d":"Mar 22","p":45500,"tvl":200.,"cvd":-15},{"d":"Apr 22","p":37700,"tvl":175.,"cvd":-45},
    {"d":"May 22","p":29000,"tvl":108.,"cvd":-80},{"d":"Jun 22","p":19000,"tvl":70.0,"cvd":-85},
    {"d":"Jul 22","p":23300,"tvl":76.0,"cvd":-20},{"d":"Aug 22","p":20050,"tvl":64.0,"cvd":-40},
    {"d":"Sep 22","p":19400,"tvl":54.0,"cvd":-50},{"d":"Oct 22","p":20500,"tvl":54.0,"cvd":-10},
    {"d":"Nov 22","p":16600,"tvl":40.0,"cvd":-75},{"d":"Dec 22","p":16530,"tvl":39.0,"cvd":-45},
    {"d":"Jan 23","p":23100,"tvl":45.0,"cvd":30},{"d":"Feb 23","p":23400,"tvl":48.0,"cvd":20},
    {"d":"Mar 23","p":28500,"tvl":53.0,"cvd":45},{"d":"Apr 23","p":29300,"tvl":55.0,"cvd":35},
    {"d":"May 23","p":27700,"tvl":50.0,"cvd":10},{"d":"Jun 23","p":30500,"tvl":56.0,"cvd":25},
    {"d":"Jul 23","p":29300,"tvl":53.0,"cvd":15},{"d":"Aug 23","p":26000,"tvl":47.0,"cvd":-20},
    {"d":"Sep 23","p":26900,"tvl":47.0,"cvd":-15},{"d":"Oct 23","p":34500,"tvl":56.0,"cvd":40},
    {"d":"Nov 23","p":37900,"tvl":62.0,"cvd":55},{"d":"Dec 23","p":42600,"tvl":70.0,"cvd":60},
    {"d":"Jan 24","p":42500,"tvl":66.0,"cvd":50},{"d":"Feb 24","p":61200,"tvl":82.0,"cvd":75},
    {"d":"Mar 24","p":71200,"tvl":96.0,"cvd":80},{"d":"Apr 24","p":60000,"tvl":84.0,"cvd":-20},
    {"d":"May 24","p":67500,"tvl":91.0,"cvd":30},{"d":"Jun 24","p":62500,"tvl":80.0,"cvd":-10},
    {"d":"Jul 24","p":66000,"tvl":83.0,"cvd":20},{"d":"Aug 24","p":59000,"tvl":74.0,"cvd":-30},
    {"d":"Sep 24","p":63900,"tvl":79.0,"cvd":10},{"d":"Oct 24","p":72300,"tvl":86.0,"cvd":40},
    {"d":"Nov 24","p":97800,"tvl":118.,"cvd":85},{"d":"Dec 24","p":93500,"tvl":125.,"cvd":70},
    {"d":"Jan 25","p":102373,"tvl":138.,"cvd":60},{"d":"Feb 25","p":84299,"tvl":118.,"cvd":10},
    {"d":"Mar 25","p":82517,"tvl":112.,"cvd":-15},{"d":"Apr 25","p":94126,"tvl":120.,"cvd":20},
    {"d":"May 25","p":104540,"tvl":148.,"cvd":60},{"d":"Jun 25","p":107105,"tvl":155.,"cvd":45},
    {"d":"Jul 25","p":115707,"tvl":172.,"cvd":65},{"d":"Aug 25","p":108208,"tvl":162.,"cvd":30},
    {"d":"Sep 25","p":113995,"tvl":170.,"cvd":50},{"d":"Oct 25","p":109555,"tvl":165.,"cvd":20},
    {"d":"Nov 25","p":90327,"tvl":140.,"cvd":-35},{"d":"Dec 25","p":87624,"tvl":132.,"cvd":-45},
    {"d":"Jan 26","p":78698,"tvl":118.,"cvd":-50},{"d":"Feb 26","p":66932,"tvl":88.0,"cvd":-72},
    {"d":"Mar 26","p":68237,"tvl":82.0,"cvd":-60},{"d":"Apr 26","p":77559,"tvl":88.0,"cvd":-30},
]

# ─── OCM Algorithm (Python port of buildOCM) ──────────────────────────────────
def compute_ocm(data: list, weights: dict = None) -> list:
    if weights is None:
        weights = {"dev":30,"slope":20,"bounce":15,"duration":15,"tvl":10,"cvd":10,"crash":15}
    w = weights
    MA_P = 12
    mas = []
    for i in range(len(data)):
        win = min(i + 1, MA_P)
        if win < 3:
            mas.append(None)
        else:
            mas.append(sum(d["p"] for d in data[i - win + 1:i + 1]) / win)

    results = []
    for i, d in enumerate(data):
        ma = mas[i]
        if not ma:
            results.append({**d, "ma": None, "score": 0, "zone": "none", "signal": False,
                            "devS":0,"slopeS":0,"momS":0,"durS":0,"tvlS":0,"cvdS":0,"crashS":0,"dev":0})
            continue

        dev = (d["p"] - ma) / ma * 100
        devS = slopeS = momS = durS = tvlS = cvdS = crashS = 0

        if dev < 0:
            ma_decl = False
            if i >= 3 and mas[i-3] and (mas[i]-mas[i-3])/mas[i-3]*100 < -3:
                ma_decl = True
            in_rec = False
            if i >= 6:
                min6 = min(data[j]["p"] for j in range(max(0,i-6), i))
                if min6 > 0 and (d["p"]-min6)/min6*100 > 25:
                    in_rec = True

            if i >= 2:
                prev_h = max(data[j]["p"] for j in range(max(0,i-2), i))
                drop = (d["p"]-prev_h)/prev_h*100 if prev_h > 0 else 0
                if drop < -15:
                    crashS = min(w["crash"], round((-drop-15)*0.9))

            devS = min(w["dev"], round((-dev/50)*w["dev"]))
            if ma_decl: devS = round(devS*0.7)
            if in_rec:  devS = round(devS*0.3)

            if i >= 2 and mas[i-1] and mas[i-2]:
                s1 = (mas[i]-mas[i-1])/mas[i-1]
                s2 = (mas[i-1]-mas[i-2])/mas[i-2]
                base = 6 if s1 < 0 else 0
                slopeS = min(w["slope"], max(0, round((s1-s2)*250+base)))
                if ma_decl: slopeS = min(slopeS, 5)
                if in_rec:  slopeS = round(slopeS*0.3)

            if i >= 4:
                win_p = [data[j]["p"] for j in range(max(0,i-6), i+1)]
                lmin = min(win_p)
                bounce = (d["p"]-lmin)/lmin*100 if lmin > 0 else 0
                momS = min(w["bounce"], round(bounce*1.5))
                if momS < 5 and i >= 2:
                    m1 = (d["p"]-data[i-1]["p"])/data[i-1]["p"]*100
                    m2 = (data[i-1]["p"]-data[i-2]["p"])/data[i-2]["p"]*100
                    if m2 < -5 and m1 > m2:
                        momS = min(w["bounce"], momS+round((m1-m2)*0.5))

            dur = 0
            for j in range(i, -1, -1):
                if mas[j] is not None and data[j]["p"] < mas[j]: dur += 1
                else: break
            durS = min(w["duration"], round(dur*1.7))
            if in_rec: durS = round(durS*0.5)

            if i >= 3 and d.get("tvl") is not None:
                tvl3m = data[i-3]["tvl"]
                tvl6m = data[max(0,i-6)]["tvl"]
                was_dec = tvl6m > tvl3m*1.05
                now_rec = d["tvl"] > tvl3m
                if was_dec and now_rec:
                    tvlS = min(w["tvl"], round((d["tvl"]-tvl3m)/tvl3m*100*0.8))
                elif now_rec:
                    tvlS = min(w["tvl"]//2, round((d["tvl"]-tvl3m)/tvl3m*50))
                elif was_dec:
                    dp = (tvl6m-d["tvl"])/tvl6m*100
                    if dp > 30: tvlS = min(w["tvl"]//2, round((dp-30)*0.2))

            if d.get("cvd") is not None and d["cvd"] > 0:
                cvdS = min(w["cvd"], round(d["cvd"]/12))
                if i >= 1 and data[i-1]["cvd"] < 0:
                    cvdS = min(w["cvd"], cvdS+3)

        total = min(100, devS+slopeS+momS+durS+tvlS+cvdS+crashS)
        zone = ("bull" if dev >= 0 else "strong" if total >= 50 else
                "watch" if total >= 35 else "early" if total >= 15 else "neutral")
        results.append({
            "date": d["d"], "price": d["p"], "tvl": d.get("tvl"), "cvd": d.get("cvd"),
            "ma": round(ma), "dev": round(dev*10)/10, "score": total,
            "devS":devS,"slopeS":slopeS,"momS":momS,"durS":durS,
            "tvlS":tvlS,"cvdS":cvdS,"crashS":crashS,
            "zone": zone, "signal": total >= 50,
        })
    return results

# ─── Agent Données ────────────────────────────────────────────────────────────
class AgentDonnees:
    def __init__(self):
        self.log = get_logger("donnees")

    def run(self) -> dict:
        self.log.info("Collecte des données de marché live...")
        data = {"timestamp": datetime.utcnow().isoformat(), "stale": False}

        # Prix BTC via CoinGecko
        try:
            r = requests.get(
                "https://api.coingecko.com/api/v3/simple/price"
                "?ids=bitcoin&vs_currencies=usd&include_24hr_change=true",
                timeout=10
            )
            btc = r.json()["bitcoin"]
            data["btc_price"] = btc["usd"]
            data["btc_change_24h"] = round(btc.get("usd_24h_change", 0), 2)
            self.log.info(f"BTC: ${data['btc_price']:,.0f} ({data['btc_change_24h']:+.2f}% 24h)")
        except Exception as e:
            self.log.warning(f"CoinGecko échec: {e}. Utilisation dernière donnée.")
            data["btc_price"] = RAW[-1]["p"]
            data["btc_change_24h"] = 0
            data["stale"] = True

        # TVL via DeFiLlama
        try:
            r = requests.get("https://api.llama.fi/v2/globalTvl", timeout=10)
            tvl_data = r.json()
            latest_tvl = tvl_data[-1]["tvl"] / 1e9 if tvl_data else RAW[-1]["tvl"]
            data["tvl_global_bn"] = round(latest_tvl, 1)
            self.log.info(f"TVL global: ${data['tvl_global_bn']}B")
        except Exception as e:
            self.log.warning(f"DeFiLlama échec: {e}")
            data["tvl_global_bn"] = RAW[-1]["tvl"]
            data["stale"] = True

        # CVD estimé (basé sur momentum prix + RAW historique)
        prev = RAW[-2]["cvd"] if len(RAW) >= 2 else 0
        change = data["btc_change_24h"]
        cvd_delta = 5 if change > 2 else -5 if change < -2 else 0
        data["cvd_estimate"] = max(-100, min(100, prev + cvd_delta))
        data["sources"] = {"price": "stale" if data["stale"] else "coingecko",
                           "tvl": "stale" if data["stale"] else "defillama"}

        out = SHARED / "02_donnees" / "market_data.json"
        out.write_text(json.dumps(data, indent=2, ensure_ascii=False))
        self.log.info(f"Données écrites → {out}")
        return data

# ─── Agent Analyse ────────────────────────────────────────────────────────────
class AgentAnalyse:
    def __init__(self):
        self.log = get_logger("analyse")

    def run(self) -> dict:
        self.log.info("Calcul du score OCM v4...")
        market_file = SHARED / "02_donnees" / "market_data.json"
        if not market_file.exists():
            raise FileNotFoundError("market_data.json manquant — lancer agent_donnees d'abord")

        market = json.loads(market_file.read_text())

        # Intégrer les données live dans RAW comme dernier point
        current_month = datetime.utcnow().strftime("%b %y")
        live_point = {
            "d": current_month,
            "p": market["btc_price"],
            "tvl": market["tvl_global_bn"],
            "cvd": market["cvd_estimate"],
        }
        data_with_live = RAW[:-1] + [live_point]

        results = compute_ocm(data_with_live)
        latest = results[-1]

        result = {
            "computed_at": market["timestamp"],
            "live_price": market["btc_price"],
            "date": latest["date"],
            "score": latest["score"],
            "zone": latest["zone"],
            "signal": latest["signal"],
            "ma12": latest["ma"],
            "deviation_pct": latest["dev"],
            "components": {
                "devS": latest["devS"], "slopeS": latest["slopeS"],
                "momS": latest["momS"], "durS": latest["durS"],
                "tvlS": latest["tvlS"], "cvdS": latest["cvdS"],
                "crashS": latest["crashS"],
            },
            "signals_history": [
                {"date": r["date"], "score": r["score"], "price": r["price"]}
                for r in results if r["signal"]
            ],
        }

        self.log.info(f"Score OCM: {result['score']}/100 — Zone: {result['zone'].upper()}")
        for k, v in result["components"].items():
            self.log.info(f"  {k}: {v}")

        out = SHARED / "03_travail" / "ocm_result.json"
        out.write_text(json.dumps(result, indent=2, ensure_ascii=False))
        self.log.info(f"Résultat écrit → {out}")
        return result

# ─── Agent Signal ─────────────────────────────────────────────────────────────
class AgentSignal:
    def __init__(self, claude_client):
        self.log = get_logger("signal")
        self.client = claude_client

    def run(self) -> dict:
        self.log.info("Interprétation du signal OCM...")
        ocm_file = SHARED / "03_travail" / "ocm_result.json"
        if not ocm_file.exists():
            raise FileNotFoundError("ocm_result.json manquant")

        ocm = json.loads(ocm_file.read_text())

        # Demander à Claude d'interpréter le signal
        prompt = f"""Tu es un analyste Bitcoin spécialisé dans l'indicateur OCM (OpenClaw Master).

Voici les données actuelles:
- Score OCM: {ocm['score']}/100
- Zone: {ocm['zone'].upper()}
- Prix BTC: ${ocm['live_price']:,}
- MA12: ${ocm.get('ma12', 'N/A'):,}
- Déviation: {ocm['deviation_pct']}%
- Composantes: Dev {ocm['components']['devS']}/30 · Slope {ocm['components']['slopeS']}/20 · Bounce {ocm['components']['momS']}/15 · Durée {ocm['components']['durS']}/15 · TVL {ocm['components']['tvlS']}/10 · CVD {ocm['components']['cvdS']}/10 · Crash {ocm['components']['crashS']}/15
- Signaux historiques confirmés: {len(ocm.get('signals_history', []))}

Réponds UNIQUEMENT en JSON valide avec cette structure exacte:
{{
  "decision": "SIGNAL_ACHAT|SURVEILLER|NEUTRE|BULL_MARKET",
  "confidence": "FAIBLE|MOYEN|ÉLEVÉ",
  "alert_required": true|false,
  "interpretation": "Analyse en 2-3 phrases",
  "recommendation": "Action recommandée",
  "risk_note": "Note de risque obligatoire",
  "next_review": "Dans X semaines/mois"
}}"""

        resp = self.client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = resp.content[0].text.strip()

        # Extraire le JSON de la réponse
        start = raw.find("{")
        end = raw.rfind("}") + 1
        decision = json.loads(raw[start:end])
        decision["score"] = ocm["score"]
        decision["zone"] = ocm["zone"]

        self.log.info(f"Décision: {decision['decision']} (confiance: {decision['confidence']})")
        self.log.info(f"Alerte requise: {decision['alert_required']}")

        out = SHARED / "04_validations" / "signal_decision.json"
        out.write_text(json.dumps(decision, indent=2, ensure_ascii=False))
        self.log.info(f"Décision écrite → {out}")
        return decision

# ─── Agent Rapport ────────────────────────────────────────────────────────────
class AgentRapport:
    def __init__(self, claude_client):
        self.log = get_logger("rapport")
        self.client = claude_client

    def run(self) -> str:
        self.log.info("Génération du rapport consolidé...")
        market = json.loads((SHARED / "02_donnees" / "market_data.json").read_text())
        ocm = json.loads((SHARED / "03_travail" / "ocm_result.json").read_text())
        decision = json.loads((SHARED / "04_validations" / "signal_decision.json").read_text())

        zone_icons = {"strong": "🟢", "watch": "🟡", "early": "🟠", "neutral": "⚪", "bull": "🔵"}
        decision_icons = {"SIGNAL_ACHAT": "⚡", "SURVEILLER": "👁", "NEUTRE": "—", "BULL_MARKET": "🚀"}

        icon = zone_icons.get(ocm["zone"], "⚪")
        dec_icon = decision_icons.get(decision["decision"], "—")

        def bar(val, max_val, width=20):
            filled = round(val / max_val * width)
            return "█" * filled + "░" * (width - filled)

        report = f"""# {icon} LiquidityAlert OCM — Rapport Autonome
**Généré le:** {datetime.now().strftime('%d/%m/%Y à %H:%M')} UTC
**Score actuel:** `{ocm['score']}/100` — Zone **{ocm['zone'].upper()}**

---

## Données de Marché (Live)

| Métrique | Valeur | Source |
|----------|--------|--------|
| Prix BTC | **${market['btc_price']:,}** | CoinGecko {'⚠ données anciennes' if market['stale'] else '✓'} |
| Variation 24h | {'+' if market['btc_change_24h'] >= 0 else ''}{market['btc_change_24h']}% | — |
| MA12 | ${ocm.get('ma12', 'N/A'):,} | Calculé |
| Déviation MA12 | {ocm['deviation_pct']}% | Calculé |
| TVL Global | ${market['tvl_global_bn']}B | DeFiLlama |
| CVD Estimé | {market['cvd_estimate']:+d} | Modèle interne |

---

## Score OCM — Décomposition des 7 Composantes

```
① Deviation  {ocm['components']['devS']:>2}/30  {bar(ocm['components']['devS'], 30)}
② Slope      {ocm['components']['slopeS']:>2}/20  {bar(ocm['components']['slopeS'], 20)}
③ Bounce     {ocm['components']['momS']:>2}/15  {bar(ocm['components']['momS'], 15)}
④ Duration   {ocm['components']['durS']:>2}/15  {bar(ocm['components']['durS'], 15)}
⑤ TVL        {ocm['components']['tvlS']:>2}/10  {bar(ocm['components']['tvlS'], 10)}
⑥ CVD        {ocm['components']['cvdS']:>2}/10  {bar(ocm['components']['cvdS'], 10)}
⑦ Flash Crash{ocm['components']['crashS']:>2}/15  {bar(ocm['components']['crashS'], 15)}
─────────────────────────────────────────────
TOTAL        {ocm['score']:>2}/100 {'▲ SIGNAL ACTIF' if ocm['signal'] else ''}
```

**Seuils:** Signal ≥ 50 | Watch ≥ 35 | Early ≥ 15

---

## {dec_icon} Décision Agent Signal

**Recommandation:** `{decision['decision']}` — Confiance: **{decision['confidence']}**

{decision['interpretation']}

**Action recommandée:** {decision['recommendation']}

> ⚠️ **Risque:** {decision['risk_note']}

**Prochaine révision:** {decision['next_review']}

---

## Signaux Historiques Confirmés

{chr(10).join(f"- **{s['date']}** — Score: {s['score']}/100 — Prix: ${s['price']:,}" for s in ocm.get('signals_history', [])[-5:])}

---

*Rapport généré automatiquement par le système multi-agents LiquidityAlert.*
*⚠️ Information uniquement — pas de conseil financier.*
"""

        md_out = SHARED / "05_livrables" / "rapport_final.md"
        json_out = SHARED / "05_livrables" / "rapport_final.json"

        md_out.write_text(report, encoding="utf-8")
        json_out.write_text(json.dumps({
            "generated_at": datetime.utcnow().isoformat(),
            "score": ocm["score"], "zone": ocm["zone"],
            "decision": decision["decision"],
            "price": market["btc_price"],
            "signal_active": ocm["signal"],
        }, indent=2), encoding="utf-8")

        self.log.info(f"Rapport écrit → {md_out}")
        return report

# ─── Orchestrateur ────────────────────────────────────────────────────────────
class Orchestrateur:
    def __init__(self, api_key: str):
        self.log = get_logger("orchestrateur")
        self.client = anthropic.Anthropic(api_key=api_key)
        self.agents = {
            "donnees":  AgentDonnees(),
            "analyse":  AgentAnalyse(),
            "signal":   AgentSignal(self.client),
            "rapport":  AgentRapport(self.client),
        }

    def run_pipeline(self) -> str:
        """Exécute le pipeline complet: données → analyse → signal → rapport"""
        self.log.info("=" * 60)
        self.log.info("ORCHESTRATEUR — Démarrage du pipeline multi-agents")
        self.log.info("=" * 60)

        steps = [
            ("donnees",  "Collecte des données live"),
            ("analyse",  "Calcul du score OCM v4"),
            ("signal",   "Interprétation du signal"),
            ("rapport",  "Génération du rapport final"),
        ]

        results = {}
        for name, description in steps:
            self.log.info(f"\n▶ Étape: {description}")
            try:
                results[name] = self.agents[name].run()
                self.log.info(f"✓ {name} terminé")
            except Exception as e:
                self.log.error(f"✗ {name} ÉCHEC: {e}")
                raise

        # Lire et afficher le rapport final
        rapport_path = SHARED / "05_livrables" / "rapport_final.md"
        rapport = rapport_path.read_text(encoding="utf-8")

        self.log.info("\n" + "=" * 60)
        self.log.info("RAPPORT FINAL LIVRÉ → projet_partage/05_livrables/")
        self.log.info("=" * 60)
        print("\n" + rapport)
        return rapport

    def run_single(self, agent_name: str):
        """Lance un seul agent"""
        if agent_name not in self.agents:
            raise ValueError(f"Agent inconnu: {agent_name}. Options: {list(self.agents.keys())}")
        self.log.info(f"Lancement agent: {agent_name}")
        return self.agents[agent_name].run()

# ─── Point d'entrée ───────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="LiquidityAlert Multi-Agent System")
    parser.add_argument("--watch", type=int, metavar="SECONDS",
                        help="Mode surveillance — répéter toutes les N secondes")
    parser.add_argument("--agent", choices=["donnees","analyse","signal","rapport"],
                        help="Lancer un seul agent spécifique")
    args = parser.parse_args()

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key and args.agent in ("signal", "rapport", None):
        print("⚠️  ANTHROPIC_API_KEY non définie. Agents signal et rapport nécessitent Claude.")
        print("   export ANTHROPIC_API_KEY=sk-ant-...")
        if args.agent not in ("donnees", "analyse"):
            sys.exit(1)

    orchestrateur = Orchestrateur(api_key)

    if args.agent:
        orchestrateur.run_single(args.agent)
    elif args.watch:
        print(f"Mode surveillance actif — cycle toutes les {args.watch}s (Ctrl+C pour arrêter)")
        while True:
            try:
                orchestrateur.run_pipeline()
                print(f"\nProchaine analyse dans {args.watch}s...")
                time.sleep(args.watch)
            except KeyboardInterrupt:
                print("\nSurveillance arrêtée.")
                break
    else:
        orchestrateur.run_pipeline()

if __name__ == "__main__":
    main()
