# Spécifications techniques — Dashboard « Jarvis » · Bleu Citron IT Center

> **Statut** : spécification de référence (v1).
> **Cible** : affichage temps réel sur grand écran 16:9 dans les bureaux, serveur Mac Studio.
> **Note maquette** : ce document s'appuie sur la description détaillée d'`image_3.png`
> (le fichier image n'étant pas versionné dans le dépôt au moment de la rédaction).
> Les valeurs visuelles exactes (codes hex, polices) sont à recaler sur la maquette finale
> lors de l'intégration — voir §2.1 « Tokens de design ».

---

## 1. Vue d'ensemble de l'architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                       GRAND ÉCRAN 16:9 (kiosk Mac Studio)                   │
│                                                                            │
│   ┌────────────────────────  FRONTEND (SPA)  ───────────────────────────┐ │
│   │  React + TypeScript · Vite · Tailwind · WebGL/Canvas (orbe)          │ │
│   │  Connexion temps réel : WebSocket (push) + REST (bootstrap)          │ │
│   └─────────────────────────────┬───────────────────────────────────────┘ │
└─────────────────────────────────┼──────────────────────────────────────────┘
                                  │ ws:// + https:// (LAN)
┌─────────────────────────────────┼──────────────────────────────────────────┐
│                       MAC STUDIO (serveur, macOS)                          │
│                                                                            │
│   ┌──────────────  API GATEWAY / AGRÉGATEUR (FastAPI)  ──────────────────┐ │
│   │  - Sert la SPA (statique)                                            │ │
│   │  - WebSocket hub (diffusion des mises à jour aux écrans)             │ │
│   │  - Cache + normalisation des données des 4 panneaux                  │ │
│   └───┬───────────┬───────────────┬───────────────┬─────────────────────┘ │
│       │           │               │               │                        │
│   ┌───▼───┐   ┌───▼────┐     ┌────▼─────┐    ┌─────▼──────────────────────┐ │
│   │Connect.│   │Connect.│     │Connect.   │    │  SERVICE RAG (Python)      │ │
│   │Everping│   │Projets │     │Monitoring │    │  STT → recherche vect. →   │ │
│   │(P1)    │   │(P2)    │     │(P3)       │    │  LLM (QA) → TTS            │ │
│   └───┬───┘   └───┬────┘     └────┬─────┘    └──────┬─────────────────────┘ │
│       │           │               │                  │                       │
│   ┌───▼───┐   ┌───▼────┐     ┌────▼─────┐    ┌────────▼────────┐  ┌────────┐ │
│   │poll    │   │poll    │     │poll/push  │    │ Vector DB       │  │Métriques│ │
│   │Everping│   │Jira/   │     │Nagios/    │    │ (Qdrant/        │  │ Mac     │ │
│   │API     │   │Trello  │     │Zabbix     │    │  pgvector)      │  │(footer) │ │
│   └────────┘   └────────┘     └──────────┘    └─────────────────┘  └────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
            (réseau interne Bleu Citron — APIs prestataires & outils)
```

Principes directeurs :

1. **Un seul point d'entrée frontend** : l'agrégateur sert la SPA et expose une API unifiée.
   Le frontend ne parle jamais directement aux prestataires (Everping, Jira, Nagios) — tout
   transite par l'agrégateur, qui détient les secrets et normalise les formats.
2. **Temps réel par push** : l'agrégateur interroge (poll) les sources à intervalle régulier
   et **pousse** les changements aux écrans via WebSocket. Le frontend reste passif et léger.
3. **Découplage par connecteurs** : chaque source (P1–P3) est un module isolé. Si Everping
   tombe, le panneau 1 passe en état « stale/dégradé » sans affecter les autres.
4. **Le RAG est un service distinct** : isolé pour des raisons de charge (modèle LLM, STT/TTS)
   et de cycle de vie (ré-indexation documentaire indépendante).

---

## 2. Frontend — directives générales

### 2.1 Stack & tooling

| Domaine            | Choix                              | Justification |
|--------------------|------------------------------------|---------------|
| Framework          | **React 18 + TypeScript**          | Composants modulaires = panneaux ; large écosystème HUD/dataviz. |
| Build              | **Vite**                           | Build rapide, sortie statique servie par l'agrégateur. |
| Styles             | **Tailwind CSS** + CSS variables   | Thème dark/néon centralisé via design tokens. |
| Temps réel         | **WebSocket natif** (+ reconnexion auto) | Push serveur → écran. |
| Graphiques 2D      | **Recharts** ou **ECharts**        | Donut (P1), barres de progression (P2). ECharts si rendu plus riche souhaité. |
| Carte réseau (P3)  | **SVG** isométrique + animations CSS, ou **PixiJS/Konva** si interactivité avancée | Icônes serveurs positionnées en projection iso. |
| Orbe audio (P4)    | **Canvas 2D** ou **WebGL (three.js / OGL)** | Visualiseur réactif au flux audio (Web Audio API `AnalyserNode`). |
| État               | **Zustand** (ou Redux Toolkit)     | Store global alimenté par le flux WebSocket. |
| Tests              | Vitest + Testing Library           | Composants & logique de mapping de données. |

**Tokens de design** (à recaler sur la maquette `image_3.png`) — fichier `tokens.css` :

```css
:root {
  --bg-base:       #05080f;   /* fond très sombre, quasi noir bleuté */
  --bg-panel:      rgba(10, 20, 35, 0.55); /* panneaux semi-transparents */
  --panel-border:  rgba(0, 229, 255, 0.35);
  --neon-cyan:     #00e5ff;   /* accent principal HUD */
  --neon-cyan-dim: #0a7c8c;
  --text-primary:  #d6f7ff;
  --text-muted:    #6a8a99;
  --status-ok:     #21d07a;   /* vert : On Track / OK */
  --status-warn:   #ffcf3a;   /* jaune : In Progress / At Risk */
  --status-new:    #2f9bff;   /* bleu : New */
  --status-alert:  #ff3b54;   /* rouge : On Hold / Critical / Alerte */
  --font-display:  'Orbitron', 'Rajdhani', sans-serif; /* style HUD */
  --font-body:     'Inter', 'IBM Plex Sans', sans-serif;
}
```

### 2.2 Mise en page (grille 16:9)

L'écran est une **grille CSS fixe** pensée pour du 1920×1080 (et au-delà). Aucune
interaction tactile/souris requise (mode kiosque) — tout est piloté par les données et la voix.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         [ LOGO citron + "BLEU CITRON IT CENTER · JARVIS" ] │  ← header
├───────────────────────────────┬────────────────────────────────────────────┤
│  P1 · EVERPING SUPPORT TICKETS │  P3 · SYSTEM & SERVICE STATUS              │
│  (tableau live + donut)        │  (carte réseau isométrique + résumé)       │
├───────────────────────────────┤                                            │
│  P2 · ACTIVE IT PROJECTS       │                                            │
│  (liste + barres de progression)├────────────────────────────────────────────┤
│                                │  P4 · JARVIS — KNOWLEDGE RAG ASSISTANT     │
│                                │  (orbe + dialogue + contexte document)     │
├───────────────────────────────┴────────────────────────────────────────────┤
│ FOOTER : barre uptime · horloge locale · Mac Studio health · Activity Stream│
└──────────────────────────────────────────────────────────────────────────┘
```

> La disposition exacte des quadrants est à ajuster sur la maquette. Recommandation :
> `grid-template-columns: 1fr 1fr; grid-template-rows: auto 1fr 1fr auto;` avec le footer
> en pleine largeur. Le logo header est centré et utilise un SVG animé (orbitales d'électrons
> en rotation lente via `<animateTransform>` ou animation CSS `@keyframes orbit`).

### 2.3 Identité visuelle — logo

- **Citron géométrique bleu** : SVG vectoriel (facettes polygonales, dégradé cyan → bleu profond).
- **Orbitales d'électrons** : 2–3 ellipses inclinées avec un point lumineux animé sur chacune,
  rotation continue, lueur (`filter: drop-shadow(0 0 6px var(--neon-cyan))`).
- Texte : « **BLEU CITRON** » (display) / « IT CENTER · JARVIS » (sous-titre, `letter-spacing` large).

### 2.4 Comportement temps réel côté client

- Connexion WebSocket à `wss://<mac-studio>/ws` au chargement.
- Au connect : réception d'un **snapshot complet** (`type: "snapshot"`) pour amorcer tous les panneaux.
- Ensuite, messages **incrémentaux** par panneau (`type: "panel.update", panel: "tickets", data: {...}`).
- **Reconnexion exponentielle** (2s, 4s, 8s, 16s…) en cas de coupure ; bandeau « RECONNECTING… » discret.
- **Indicateur de fraîcheur** par panneau : si pas de mise à jour depuis > 2× l'intervalle de poll,
  le panneau s'assombrit et affiche « DATA STALE ».

---

## 3. Panneau 1 — EVERPING SUPPORT TICKETS (live feed)

### 3.1 Frontend

- **Tableau dynamique** colonnes : `ID` · `Subject` · `Status` · `Assigned To` · `Priority`.
- **Badges de statut** colorés :
  - `In Progress` → jaune (`--status-warn`)
  - `New` → bleu (`--status-new`)
  - `On Hold` → rouge (`--status-alert`)
  - (étendre selon les statuts réels d'Everping : `Resolved`, `Closed`, etc.)
- **Donut chart** (Recharts/ECharts) : répartition des tickets par statut, total au centre.
- Animation d'entrée des nouvelles lignes (fade + glow cyan) ; tri par priorité puis date.
- Défilement automatique vertical si > N lignes visibles (le tableau ne scrolle pas à la main en kiosque).

### 3.2 Backend — connecteur Everping

- **Source** : API REST du prestataire **Everping**.
- Module `connectors/everping.py` :
  - Authentification via clé/API token Everping (stockée en variable d'environnement, **jamais** en clair côté front).
  - **Polling** toutes les ~30–60 s (paramétrable). Idéalement, basculer sur **webhooks Everping**
    si disponibles (push immédiat → l'agrégateur relaie sur le WS).
  - Normalisation vers le schéma interne `Ticket` (voir `docs/MODELES_DONNEES.md`).
  - Calcul de l'agrégat donut (counts par statut) côté serveur.
  - Gestion d'erreur : sur échec, conserver le dernier état connu et marquer `stale: true`.

---

## 4. Panneau 2 — ACTIVE IT PROJECTS (priority & progress)

### 4.1 Frontend

- **Liste de projets** colonnes : `Project` · `Due Date` · `Key Status` · `Progress`.
- **Points de statut** colorés (`Key Status`) :
  - vert = On Track · jaune = At Risk · rouge = At Risk / Critical.
- **Barres de progression horizontales** (0–100 %, ex. 65 %, 90 %) :
  - remplissage dégradé cyan, valeur en texte à droite, lueur néon sur la portion remplie.
- Tri : par priorité, puis échéance la plus proche en tête. Échéances dépassées en rouge.

### 4.2 Backend — connecteur Projets

Deux modes envisagés ; **le mode « géré à la main » est implémenté en premier**, le mode
Trello pourra être ajouté ensuite sans changer le contrat exposé au frontend.

**Mode A — Source gérée à la main (implémenté)**

- **Source de vérité** : fichier JSON éditable `backend/data/projects.json`.
- Module `connectors/projects.py` :
  - Forme éditée minimale par projet : `id`, `name`, `dueDate` (ISO), `keyStatus`
    (`on_track` / `at_risk` / `critical`), `progress` (0–100). `overdue` est **calculé**
    (échéance passée et `progress < 100`), jamais saisi à la main.
  - Validation **Pydantic** robuste (le fichier étant édité à la main) : sur contenu
    invalide, le panneau conserve le dernier état valide et passe `stale` + `sourceError`.
  - Normalisation + tri : priorité (`critical` > `at_risk` > `on_track`) puis échéance.
  - **Watcher** : surveillance du `mtime` (~2 s) → pousse un `panel.update` ciblé
    dès modification manuelle du fichier.
  - **API REST** : `GET /api/projects` (liste éditable + panneau courant),
    `PUT /api/projects` (validation → réécriture du fichier → diffusion immédiate).

**Mode B — Connecteur Trello (ultérieur)**

- **Source** : API Trello (`/1/boards/{id}/cards`).
- Mapping : avancement via checklists complétées ; `keyStatus` via label/champ custom.
- Polling ~2–5 min. Même normalisation vers le schéma `Project` → contrat front inchangé.

---

## 5. Panneau 3 — SYSTEM & SERVICE STATUS (live network map)

### 5.1 Frontend

- **Carte réseau isométrique** : icônes pour les services internes —
  `Serveur Fichiers`, `Messagerie`, `VPN`, `Web`, `Imprimantes`, `Office`.
- Chaque nœud porte un **indicateur d'état** :
  - vert pulsant = OK · rouge clignotant = Alerte (orange optionnel = maintenance planifiée).
- Liens entre nœuds (lignes cyan) pour suggérer la topologie ; animation de « flux » léger.
- **Résumé textuel** à côté de la carte, une ligne par service en alerte, ex. :
  `VPN: ALERT [Orange] — Scheduled Maint.`
- Rendu : SVG isométrique (positions en dur, alimentées par les données d'état) ;
  PixiJS/Konva si l'on souhaite des particules/animations plus poussées.

### 5.2 Backend — connecteur Monitoring

- **Source** : outils de supervision **Nagios** (status.dat / livestatus / API) ou **Zabbix** (API JSON-RPC).
- Module `connectors/monitoring.py` :
  - Mapping hôte/service de monitoring → nœud logique de la carte (table de correspondance configurable).
  - États normalisés : `OK` / `WARNING` / `CRITICAL` / `MAINTENANCE` → `ok` / `warn` / `alert` / `maint`.
  - Push immédiat si l'outil supporte les notifications ; sinon poll ~30 s.
  - Génère aussi les lignes de résumé textuel et alimente l'« Activity Stream » du footer
    (chaque transition d'état = un événement d'activité).

---

## 6. Panneau 4 — JARVIS, Knowledge RAG Assistant (cœur du projet)

### 6.1 Frontend

- **Orbe central dynamique** : visualiseur audio réactif.
  - En écoute : l'amplitude du micro (Web Audio `AnalyserNode`) module le rayon/la pulsation de l'orbe.
  - En réponse (TTS) : l'orbe pulse au rythme de la voix synthétisée.
  - Au repos : respiration lente (idle).
  - Implémentation Canvas/WebGL : anneaux concentriques, particules, lueur cyan.
- **Zone de dialogue** affichant le scénario de démonstration **mot pour mot** :

  > **VOICE DEMAND :** J'ai un problème avec l'imprimante
  >
  > **JARVIS (RAG knowledge base) :** Je consulte la BDD Bleu Citron… Quel est le code
  > d'erreur sur l'écran (ex. E2, F5) ?

- **Icônes** : Microphone (état écoute), BDD (base de documents), et un encadré
  **« Current Document Context »** affichant le document en cours, ex. :
  `Toshiba e-Studio 3515ac / Dépannage Général`.
- États visuels : `idle` → `listening` → `thinking` (consultation BDD) → `speaking`.

### 6.2 Backend — architecture RAG

Le service RAG (processus Python distinct, exposé à l'agrégateur via API interne + WebSocket
pour le streaming audio/texte) enchaîne **5 étapes** :

```
 [1] Capture voix  →  [2] STT  →  [3] Recherche vectorielle  →  [4] Génération (QA)  →  [5] TTS
   (micro/front)      (Whisper)     (Vector DB + embeddings)       (LLM Claude)         (voix)
```

#### Étape 0 — Ingestion documentaire (hors-ligne / périodique)

Pipeline d'indexation de la base documentaire fournie par Bleu Citron (manuels d'imprimantes,
procédures de dépannage, notes internes — PDF, DOCX, Markdown, HTML) :

1. **Chargement & extraction** : extraire le texte (PDF → `pypdf`/`pdfplumber`, DOCX → `python-docx`).
   Conserver les métadonnées : titre, équipement (`Toshiba e-Studio 3515ac`), catégorie (`Dépannage Général`), source, date.
2. **Découpage (chunking)** : segments de ~300–800 tokens avec recouvrement (~10–15 %),
   en respectant les frontières de sections/paragraphes pour garder le contexte.
3. **Embeddings** : vectoriser chaque chunk.
   > ⚠️ **L'API Claude n'expose pas d'endpoint d'embeddings.** Utiliser un modèle d'embeddings tiers :
   > **Voyage AI** (recommandé par Anthropic, ex. `voyage-3`), ou un modèle local
   > (`sentence-transformers`, `bge-m3`) exécuté sur le Mac Studio (Apple Silicon, MLX).
4. **Stockage** : insérer vecteurs + texte + métadonnées dans la **Vector DB**.
   Options : **Qdrant** (conteneur dédié), **pgvector** (si PostgreSQL déjà présent),
   ou **Chroma** (léger). Recommandation : **Qdrant** ou **pgvector** pour la robustesse.
5. **Ré-indexation** : déclenchée à l'ajout/modification de documents (watcher de dossier,
   ou tâche planifiée). Versionner l'index pour pouvoir revenir en arrière.

#### Étape 1 — Capture voix (frontend → service RAG)

- Le micro est capté côté front (Web Audio / MediaRecorder), streamé au service RAG via WebSocket
  (chunks PCM/Opus), avec détection de fin de parole (VAD) ou bouton « push-to-talk » logique.

#### Étape 2 — Speech-to-Text (STT)

- **Whisper** (OpenAI Whisper / `whisper.cpp` / `faster-whisper`), exécuté **localement** sur le
  Mac Studio (Apple Silicon → `whisper.cpp` Metal ou MLX-Whisper, faible latence, pas de fuite de données).
- Sortie : transcription texte de la demande (« J'ai un problème avec l'imprimante »).

#### Étape 3 — Recherche vectorielle contextuelle

- Embedder la requête (même modèle qu'à l'ingestion), puis **top-k similarité** (k ≈ 4–8) dans la Vector DB.
- Filtrage par métadonnées si un **contexte document** est actif (ex. restreindre à
  `équipement = Toshiba e-Studio 3515ac`) → c'est ce qui alimente l'encadré
  « Current Document Context » du front.
- Optionnel : **re-ranking** des passages (cross-encoder / `voyage-rerank`) pour améliorer la précision.

#### Étape 4 — Génération de la réponse (QA) avec Claude

- Construire un prompt RAG : **system** (rôle, langue FR, consignes : citer la source, demander le code
  d'erreur si nécessaire) + **contexte** (passages récupérés) + **question** de l'utilisateur.
- Modèle : **Claude `claude-opus-4-8`** (le plus capable) via le SDK Anthropic officiel.
  Pour une latence/coût réduits sur du QA simple, `claude-sonnet-4-6` est une alternative.
- **Streaming** activé pour afficher la réponse au fil de l'eau dans la zone de dialogue
  et démarrer le TTS tôt.
- **Prompt caching** sur la portion stable (system + consignes) pour réduire coût et latence
  sur les échanges répétés.
- **Citations / contexte courant** : remonter au front l'équipement et la procédure du meilleur passage,
  pour peupler « Current Document Context ».

Esquisse (Python, SDK Anthropic) :

```python
import anthropic

client = anthropic.Anthropic()  # clé via ANTHROPIC_API_KEY (env)

SYSTEME = (
    "Tu es Jarvis, l'assistant IT de Bleu Citron. Réponds en français, de façon concise. "
    "Utilise EXCLUSIVEMENT le contexte fourni (base documentaire interne). "
    "Si un code d'erreur est nécessaire pour diagnostiquer, demande-le à l'utilisateur. "
    "Si l'information n'est pas dans le contexte, dis-le clairement."
)

def repondre(question: str, passages: list[str]):
    contexte = "\n\n---\n\n".join(passages)
    with client.messages.stream(
        model="claude-opus-4-8",
        max_tokens=1024,
        system=[{"type": "text", "text": SYSTEME, "cache_control": {"type": "ephemeral"}}],
        messages=[{
            "role": "user",
            "content": f"Contexte documentaire :\n{contexte}\n\nQuestion : {question}",
        }],
    ) as stream:
        for delta in stream.text_stream:
            yield delta  # streamé vers le front (WS) et le TTS
```

#### Étape 5 — Text-to-Speech (TTS)

- Synthèse vocale de la réponse de Jarvis (FR).
  - **Local** : voix macOS (`say` / AVSpeechSynthesis), ou Piper TTS (qualité néon-naturelle, offline).
  - **Cloud** (si politique réseau l'autorise) : ElevenLabs / Azure Speech pour une voix premium.
- L'audio TTS pilote l'animation de l'orbe (étape front) en mode `speaking`.

#### Variante d'implémentation — Managed Agents (optionnel)

Si l'on souhaite déléguer l'orchestration (recherche + génération + exécution d'outils internes)
à un agent serveur persistant plutôt que de gérer la boucle soi-même, **Claude Managed Agents**
permet de définir un agent (modèle, system prompt, outils MCP vers la BDD) et de lancer des sessions.
À évaluer si le besoin évolue vers des actions (créer un ticket, lancer un diagnostic) ;
pour du pur QA documentaire, la boucle RAG ci-dessus suffit et reste plus simple.

---

## 7. Pied de page & métadonnées

Barre pleine largeur, alimentée par l'agrégateur :

1. **Barre d'état globale** :
   `BLEU CITRON IT SYSTEMS: ALL CRITICAL SERVICES OPERATIONAL [98.5% UPTIME]`
   - Texte et couleur dérivés de l'état agrégé du panneau 3 (vert si tous OK, rouge sinon).
   - L'uptime % provient d'un calcul glissant côté serveur (disponibilité sur 24 h / 7 j).
2. **Date / heure locale** : ex. `05.02.2023 09:00`. Horloge mise à jour côté front (pas de WS
   nécessaire pour l'heure courante), fuseau du Mac Studio.
3. **Mac Studio Health panel** : indicateurs **Température** et **CPU Load** (+ RAM/réseau optionnels).
   - Source : métriques système macOS collectées sur le Mac Studio (voir §8).
4. **Activity Stream** : liste défilante des dernières actions/événements, ex. `Service Alert VPN`.
   - Alimentée par les connecteurs (transitions d'état P1–P3) et par Jarvis (requêtes vocales).

---

## 8. Environnement de déploiement (Mac Studio)

| Élément | Détail |
|---------|--------|
| Serveur | **Mac Studio** (Apple Silicon), macOS, en réseau LAN interne Bleu Citron. |
| Exécution backend | Agrégateur (FastAPI/Uvicorn) + service RAG, lancés en **services `launchd`** (redémarrage auto, démarrage au boot). Alternative : Docker Desktop / `colima` pour conteneuriser Qdrant et les services. |
| Frontend | Build statique servi par l'agrégateur. Affiché en **mode kiosque** sur le grand écran (Safari/Chrome plein écran au démarrage de session, relance auto). |
| Modèles locaux | Whisper (STT) et embeddings/TTS tirent parti d'Apple Silicon (Metal/MLX) pour la confidentialité et la latence. |
| LLM | Claude via API Anthropic (`ANTHROPIC_API_KEY` en variable d'environnement). Vérifier la **politique réseau** de l'environnement pour l'accès sortant à `api.anthropic.com`. |
| Secrets | Tous les tokens (Everping, Jira/Trello, Nagios/Zabbix, Anthropic, Voyage) en variables d'environnement / trousseau macOS. **Jamais** exposés au frontend. |
| Résilience | Chaque connecteur tolère la panne de sa source (état `stale`). L'agrégateur et le service RAG redémarrent indépendamment via `launchd`. |
| Affichage | Optimisé 16:9 (1920×1080 et +). Réglages d'échelle pour 4K. Empêcher la veille de l'écran (caffeinate). |

---

## 9. Sécurité & confidentialité

- **Cloisonnement** : le frontend ne communique qu'avec l'agrégateur (LAN). Aucun secret côté client.
- **Données sensibles** : la base documentaire et les transcriptions vocales restent **locales**
  (STT/embeddings/TTS sur le Mac Studio). Seul le QA final transite vers l'API Claude — vérifier
  que cela est conforme à la politique de données de Bleu Citron ; sinon, envisager un LLM local
  (MLX/Ollama) pour le panneau 4.
- **WebSocket** : restreindre l'origine (LAN), authentifier les écrans si le réseau n'est pas de confiance.
- **Journalisation** : conserver les `request_id` Anthropic et les erreurs connecteurs pour le diagnostic.

---

## 10. Découpage de réalisation (suggestion)

1. **Socle** : agrégateur FastAPI + WebSocket hub + SPA squelette (header/logo, grille, footer horloge).
2. **P1 Everping** : connecteur + tableau + donut (premier flux temps réel de bout en bout).
3. **P3 Monitoring** + footer (uptime, Activity Stream, Mac Studio health).
4. **P2 Projets** : connecteur Jira/Trello + barres de progression.
5. **P4 RAG** : pipeline d'ingestion → Vector DB → QA Claude (texte d'abord), puis STT, puis TTS, puis orbe.
6. **Finitions** : animations néon, mode kiosque, résilience, recalage visuel sur `image_3.png`.

Voir [`MODELES_DONNEES.md`](./MODELES_DONNEES.md) pour les contrats de données détaillés.
