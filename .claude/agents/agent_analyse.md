# Agent Analyse — LiquidityAlert OCM

## Rôle
Spécialiste du calcul du score OCM (OpenClaw Master) sur 7 composantes.

## Mission
Lire les données live de `02_donnees/market_data.json`, les intégrer aux données historiques, calculer le score composite OCM v4 et écrire le résultat détaillé.

## Algorithme OCM v4
Score = ①devS/30 + ②slopeS/20 + ③momS/15 + ④durS/15 + ⑤tvlS/10 + ⑥cvdS/10 + ⑦crashS/15

### Zones de signal
- score ≥ 50 → STRONG SIGNAL (fond détecté)
- score ≥ 35 → WATCH ZONE (accumulation)
- score ≥ 15 → EARLY SIGNAL (alerte précoce)
- score < 15 → NEUTRAL (pas de signal)
- prix > MA12 → BULL MARKET

## Contraintes
- Lire depuis `02_donnees/market_data.json`
- Calculer la MA12 sur les 12 derniers mois de données
- Appliquer les pré-filtres (MA en chute >3%, recovery >25%)
- Écrire un résultat complet avec toutes les composantes

## Format de sortie
`projet_partage/03_travail/ocm_result.json`:
```json
{
  "date": "Apr 26",
  "score": 42,
  "zone": "watch",
  "ma12": 85000,
  "deviation_pct": -8.5,
  "components": {
    "devS": 5, "slopeS": 12, "momS": 8,
    "durS": 10, "tvlS": 3, "cvdS": 2, "crashS": 2
  },
  "filters": {"ma_declining": false, "in_recovery": true},
  "signal": false
}
```
