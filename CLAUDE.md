# LiquidityAlert — Guide Multi-Agents

## Architecture Multi-Agents

Ce projet utilise un système de 5 agents Claude spécialisés qui travaillent en parallèle via un filesystem partagé.

```
Orchestrateur
├── Agent Données    → projet_partage/02_donnees/
├── Agent Analyse    → projet_partage/03_travail/
├── Agent Signal     → projet_partage/04_validations/
└── Agent Rapport    → projet_partage/05_livrables/
```

Les définitions d'agents sont dans `.claude/agents/`.

## Commandes Autonomes

```bash
# Pipeline complet (nécessite ANTHROPIC_API_KEY)
python autonomous_agent.py

# Mode surveillance autonome (analyse toutes les heures)
python autonomous_agent.py --watch 3600

# Agents individuels
python autonomous_agent.py --agent donnees   # Données live seulement
python autonomous_agent.py --agent analyse   # Score OCM seulement
```

## Filesystem Partagé

| Dossier | Contenu | Écrit par |
|---------|---------|-----------|
| `01_brief/` | Brief de la tâche | Manuel |
| `02_donnees/` | Prix BTC, TVL, CVD live | Agent Données |
| `03_travail/` | Score OCM calculé | Agent Analyse |
| `04_validations/` | Décision signal | Agent Signal |
| `05_livrables/` | Rapport final | Agent Rapport |

## Frontend React (Dashboard)

```bash
npm install && npm run dev
```

Le dashboard React sur `http://localhost:5173` contient l'onglet **⚡ AI AGENT** avec:
- Prix live auto-refresh (CoinGecko)
- Optimiseur ML génétique des poids
- Analyse Claude (nécessite clé API)
- Mémoire des signaux (localStorage)

## Logs

Chaque agent écrit ses logs dans `logs/{agent}.log`.

## Variables d'environnement

```bash
export ANTHROPIC_API_KEY=sk-ant-api03-...
```
