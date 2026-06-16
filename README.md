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

## Stack retenue (résumé)

- **Frontend** : React + TypeScript + Vite, Tailwind CSS, WebSocket, Recharts/ECharts, animation orbe via WebGL/Canvas.
- **Backend** : Python FastAPI (gateway + RAG) tournant en service `launchd` sur macOS, WebSocket/SSE pour le temps réel.
- **RAG / Voix** : Vector DB (Qdrant/pgvector), embeddings + LLM (local via Ollama/MLX ou API Claude), STT Whisper, TTS.

Voir les spécifications pour les détails d'architecture et de déploiement.
