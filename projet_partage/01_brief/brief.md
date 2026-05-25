# Brief — Analyse Autonome LiquidityAlert OCM

## Objectif
Analyser l'état actuel du marché Bitcoin via l'indicateur OCM (OpenClaw Master) v4 et produire un rapport avec recommandation d'investissement.

## Contexte
LiquidityAlert est un indicateur composite qui détecte les fonds de cycle Bitcoin en combinant 7 métriques techniques et on-chain :
- Déviation prix / MA12 (30 pts max)
- Décélération pente MA (20 pts max)
- Rebond depuis le creux (15 pts max)
- Durée sous MA12 (15 pts max)
- Récupération TVL (10 pts max)
- Signal CVD (10 pts max)
- Crash éclair (15 pts max)

**Signal actif si score ≥ 50 / 100**

## Données historiques disponibles
97 mois de données BTC (Jan 2018 → Apr 2026) dans l'algorithme OCM.

## Livrables attendus
1. `02_donnees/market_data.json` — données live actuelles
2. `03_travail/ocm_result.json` — score OCM calculé
3. `04_validations/signal_decision.json` — décision d'alerte
4. `05_livrables/rapport_final.md` — rapport consolidé

## Audience
Investisseurs particuliers suivant le cycle BTC, cherchant à identifier les zones d'accumulation optimales.

## Fréquence
Analyse mensuelle ou à la demande. Toujours basée sur les données les plus récentes disponibles.
