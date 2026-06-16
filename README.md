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

**En une commande** (build le frontend si Node est présent, puis démarre l'agrégateur) :

```bash
./run.sh
```

➡️ Interface sur **http://localhost:8000** · admin projets sur **http://localhost:8000/#admin**

Prérequis : Python 3.11+ (obligatoire) et Node 18+ (pour builder l'interface).

<details><summary>Démarrage manuel / mode développement (rechargement à chaud)</summary>

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

</details>

### État d'avancement (brique 1 — socle)

- ✅ Agrégateur FastAPI : `/api/health`, `/api/snapshot`, hub WebSocket `/ws` (snapshot d'amorçage + diffusion périodique).
- ✅ SPA : header + logo animé, grille 16:9, 4 panneaux câblés au store (Zustand) via WebSocket avec reconnexion exponentielle, footer (horloge live, uptime, santé Mac Studio, activity stream).
- ✅ **Panneau Projets (P2) — source gérée à la main** : fichier `backend/data/projects.json` (édition directe ou via `GET`/`PUT /api/projects`), validé, normalisé, surveillé (watcher → `panel.update` temps réel).
- ✅ **Panneau Jarvis (P4) — RAG texte** : base documentaire `backend/data/knowledge/*.md`, récupération TF-IDF (pur Python), réponse via Claude `claude-opus-4-8` si `ANTHROPIC_API_KEY` est défini (sinon mode *stub* hors-ligne). Saisie dans le panneau → `rag.event` temps réel (contexte + réponse en streaming). Endpoints `POST /api/rag/ask` et `POST /api/rag/reindex`.
- ✅ **Panneau Jarvis (P4) — voix** : reconnaissance et synthèse vocales via la Web Speech API du navigateur (STT + TTS, fr-FR), bouton micro, lecture des réponses, mute, orbe réactif. Repli texte si l'API n'est pas supportée. Migration possible vers Whisper local côté serveur plus tard.
- ✅ **Monitoring (P3) — supervision réelle** : l'agrégateur effectue lui-même des sondes de disponibilité (`http`/`tcp`/`self`/`manual`) décrites dans `backend/data/monitoring.json` (éditable à chaud ou via `GET`/`PUT /api/monitoring`), avec re-sonde périodique, latence par nœud, et santé globale dérivée. Métriques système du footer (CPU/RAM, température) **réelles** via `psutil`.
- ✅ **Tickets Everping (P1)** : pas d'API publique → on rejoue l'**API GraphQL privée** de la plateforme (`appv2.everping.eu`), authentifiée par **Firebase**. Avec un **refresh token** Firebase (capturé une fois), le serveur régénère seul les ID tokens et récupère les tickets en continu. Sans credentials, un **échantillon anonymisé** est servi (mode démo). Normalisation vers le contrat `Ticket`, tickets ouverts en tête.
- ⏳ À venir : amélioration du RAG (embeddings + re-ranking). Trello (P2) possible en complément du mode manuel.

### Activer les tickets Everping réels (P1)

L'API Everping est protégée par Firebase Auth (SSO Google). Pour que le serveur s'y connecte seul :

1. Connecte-toi à `https://appv2.everping.eu` dans Chrome.
2. **DevTools (F12) → Application → IndexedDB → `firebaseLocalStorageDb` → `firebaseLocalStorage`** : ouvre l'entrée et copie `value.stsTokenManager.refreshToken`.
3. Sur le serveur, avant `./run.sh` :

```bash
export EVERPING_REFRESH_TOKEN="AMf-..."     # le refresh token copié
# optionnel (valeurs par défaut = Bleu Citron) :
# export EVERPING_CLIENT_ID="ecd0193d-..."
```

Le connecteur régénère les ID tokens automatiquement (valables ~1 h) et rafraîchit les tickets toutes les 60 s. Dépannage rapide : `export EVERPING_ID_TOKEN="<jwt>"` pour tester avec un token direct (expire en ~1 h).

### Configurer la supervision (P3)

Éditer `backend/data/monitoring.json` (appliqué en quelques secondes) ou `PUT /api/monitoring`.
Chaque nœud a un `check` :
- `{"type":"http","target":"https://hote/health"}` — sonde HTTP réelle (≥500 → `alert`, ≥400 → `warn`) ;
- `{"type":"tcp","target":"hote:port"}` — test de connexion TCP ;
- `{"type":"self"}` — cet agrégateur (toujours `ok` s'il répond) ;
- `{"type":"manual","state":"ok|warn|alert|maint"}` — état fixe.

### Activer Claude pour le RAG (P4)

Par défaut, le RAG répond en mode *stub* (à partir du passage trouvé), ce qui fonctionne sans clé.
Pour des réponses rédigées par Claude :

```bash
export ANTHROPIC_API_KEY=sk-ant-...   # avant de lancer ./run.sh
```

Ajouter / modifier des documents : déposer des fichiers `.md` dans `backend/data/knowledge/`
(en-tête optionnel `equipment` / `procedure` entre `---`), puis `curl -X POST http://localhost:8000/api/rag/reindex`.

### Gérer les projets (P2) à la main

Trois possibilités :

1. **Page d'admin web** : ouvrir `http://localhost:5173/#admin` (ou le lien **ADMIN** en haut
   à droite du dashboard) — formulaire pour ajouter / modifier / supprimer les projets, bouton
   *Enregistrer* qui valide, réécrit le fichier et diffuse la mise à jour à l'écran.
2. **Édition directe** du fichier `backend/data/projects.json` (le watcher pousse la mise à jour).
3. **API REST** :

```bash
curl -X PUT http://localhost:8000/api/projects \
  -H 'Content-Type: application/json' \
  -d '{"projects":[{"id":"PRJ-01","name":"Refonte intranet","dueDate":"2026-07-15","keyStatus":"on_track","progress":65}]}'
```

`overdue` est calculé automatiquement ; tri par priorité (`critical` > `at_risk` > `on_track`) puis échéance.

## Stack retenue (résumé)

- **Frontend** : React + TypeScript + Vite, Tailwind CSS, WebSocket, Recharts/ECharts, animation orbe via WebGL/Canvas.
- **Backend** : Python FastAPI (gateway + RAG) tournant en service `launchd` sur macOS, WebSocket/SSE pour le temps réel.
- **RAG / Voix** : Vector DB (Qdrant/pgvector), embeddings + LLM (local via Ollama/MLX ou API Claude), STT Whisper, TTS.

Voir les spécifications pour les détails d'architecture et de déploiement.
