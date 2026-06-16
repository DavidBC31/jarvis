# Jarvis — Dashboard IT Center · Bleu Citron

> Tableau de bord temps réel à afficher sur grand écran (16:9) dans les bureaux de
> **Bleu Citron**, propulsé par un **Mac Studio** faisant office de serveur.
> Style « futuriste / HUD » cyberpunk (dark mode, accents néon cyan).

Jarvis agrège en un seul écran l'état du support, des projets IT, de
l'infrastructure réseau, et expose un assistant vocal **RAG**
(Retrieval-Augmented Generation) branché sur la base documentaire interne.

## Panneaux

| # | Panneau | Source de données |
|---|---------------------------------------------|----------------------------------------|
| 1 | Everping Support Tickets (live feed)        | API Everping                           |
| 2 | Active IT Projects (priority & progress)    | API interne IT (Jira / Trello)         |
| 3 | System & Service Status (live network map)  | Monitoring (Nagios / Zabbix)           |
| 4 | Jarvis — Knowledge RAG Assistant (vocal)    | Base documentaire interne + LLM        |
| — | Pied de page (uptime, horloge, Mac health)  | Agrégateur interne + métriques système |

## Documentation

- [`docs/SPECIFICATIONS_TECHNIQUES.md`](docs/SPECIFICATIONS_TECHNIQUES.md) — spécifications détaillées frontend / backend / RAG / déploiement.
- [`docs/MODELES_DONNEES.md`](docs/MODELES_DONNEES.md) — schémas des contrats d'API et payloads temps réel.

## Structure du dépôt

```
backend/   Agrégateur FastAPI : REST (/api) + hub WebSocket (/ws) + état simulé
frontend/  SPA React + TS + Vite + Tailwind (header/logo, grille 16:9, footer, panneaux)
docs/      Spécifications techniques et contrats de données
```

## Démarrage rapide (dev)

**Backend** (port 8000) :

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend** (port 5173, proxie `/api` et `/ws` vers le backend) :

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
```

En production, `npm run build` génère `frontend/dist`, servi directement par l'agrégateur
(la SPA est alors disponible sur le port du backend).

### État d'avancement (brique 1 — socle)

- ✅ Agrégateur FastAPI : `/api/health`, `/api/snapshot`, hub WebSocket `/ws` (snapshot d'amorçage + diffusion périodique).
- ✅ SPA : header + logo animé, grille 16:9, 4 panneaux câblés au store (Zustand) via WebSocket avec reconnexion exponentielle, footer (horloge live, uptime, santé Mac Studio, activity stream).
- ⏳ Données encore **simulées** côté serveur — les connecteurs réels (Everping, Jira/Trello, Nagios/Zabbix) et le service RAG (panneau 4) sont les briques suivantes.

## Stack retenue (résumé)

- **Frontend** : React + TypeScript + Vite, Tailwind CSS, WebSocket, Recharts/ECharts, animation orbe via WebGL/Canvas.
- **Backend** : Python FastAPI (gateway + RAG) tournant en service `launchd` sur macOS, WebSocket/SSE pour le temps réel.
- **RAG / Voix** : Vector DB (Qdrant/pgvector), embeddings + LLM (local via Ollama/MLX ou API Claude), STT Whisper, TTS.

Voir les spécifications pour les détails d'architecture et de déploiement.
