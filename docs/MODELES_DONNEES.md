# Modèles de données & contrats — Dashboard « Jarvis »

Schémas internes normalisés par l'agrégateur et poussés au frontend via WebSocket.
Le frontend ne connaît **que** ces schémas — jamais les formats bruts d'Everping, Jira, Nagios, etc.

Format : JSON. Types décrits façon TypeScript pour servir de source partagée front/back.

---

## 1. Enveloppe WebSocket

```ts
// Message générique poussé sur wss://<mac-studio>/ws
type WsMessage =
  | { type: "snapshot"; data: DashboardState }                 // état complet (au connect)
  | { type: "panel.update"; panel: PanelId; data: unknown }    // mise à jour incrémentale
  | { type: "rag.event"; data: RagEvent };                     // flux de l'assistant vocal

type PanelId = "tickets" | "projects" | "services" | "footer";

interface DashboardState {
  tickets:  TicketsPanel;
  projects: ProjectsPanel;
  services: ServicesPanel;
  footer:   FooterPanel;
  serverTime: string;        // ISO 8601, fuseau Mac Studio
}
```

Chaque panneau porte un drapeau de fraîcheur :

```ts
interface PanelMeta {
  updatedAt: string;   // ISO 8601 — dernière mise à jour réussie de la source
  stale: boolean;      // true si la source n'a pas répondu depuis > 2× l'intervalle de poll
  sourceError?: string;
}
```

---

## 2. Panneau 1 — Everping Support Tickets

```ts
type TicketStatus = "new" | "in_progress" | "on_hold" | "resolved" | "closed";
type TicketPriority = "low" | "medium" | "high" | "urgent";

interface Ticket {
  id: string;            // ex. "EVP-10293"
  subject: string;
  status: TicketStatus;  // mappé vers un badge couleur côté front
  assignedTo: string | null;
  priority: TicketPriority;
  updatedAt: string;     // ISO 8601
}

interface TicketsPanel extends PanelMeta {
  tickets: Ticket[];
  // agrégat pré-calculé côté serveur pour le donut
  statusCounts: Record<TicketStatus, number>;
  total: number;
}
```

Correspondance couleurs (front) : `new → bleu`, `in_progress → jaune`, `on_hold → rouge`.

---

## 3. Panneau 2 — Active IT Projects

```ts
type KeyStatus = "on_track" | "at_risk" | "critical";   // vert / jaune / rouge

interface Project {
  id: string;
  name: string;
  dueDate: string;       // ISO 8601 (date)
  keyStatus: KeyStatus;
  progress: number;      // 0–100 (%)
  overdue: boolean;      // dueDate dépassée et non terminé
}

interface ProjectsPanel extends PanelMeta {
  projects: Project[];   // triés : priorité puis échéance la plus proche
}
```

---

## 4. Panneau 3 — System & Service Status

```ts
type ServiceState = "ok" | "warn" | "alert" | "maint";

interface ServiceNode {
  id: string;            // ex. "vpn"
  label: string;         // "VPN"
  state: ServiceState;   // vert / orange-warn / rouge / maintenance
  // position sur la carte iso (gérée côté front, mais surchargée si fournie)
  x?: number;
  y?: number;
  detail?: string;       // ex. "Scheduled Maint."
}

interface ServiceLink {
  from: string;          // id de nœud
  to: string;
}

interface ServicesPanel extends PanelMeta {
  nodes: ServiceNode[];  // Fichiers, Messagerie, VPN, Web, Imprimantes, Office...
  links: ServiceLink[];  // topologie pour la carte
  summary: string[];     // lignes textuelles, ex. "VPN: ALERT [Orange] — Scheduled Maint."
}
```

---

## 5. Pied de page

```ts
interface FooterPanel extends PanelMeta {
  globalStatus: {
    label: string;       // "ALL CRITICAL SERVICES OPERATIONAL"
    healthy: boolean;    // pilote la couleur (vert/rouge)
    uptimePercent: number; // ex. 98.5
  };
  macStudio: {
    temperatureC: number;
    cpuLoadPercent: number;
    ramUsedPercent?: number;
  };
  activityStream: ActivityEvent[];  // plus récents en tête
}

interface ActivityEvent {
  id: string;
  at: string;            // ISO 8601
  label: string;         // ex. "Service Alert VPN"
  severity: "info" | "warn" | "alert";
}
```

---

## 6. Panneau 4 — Assistant RAG (flux d'événements)

Le service RAG streame son état au front pour piloter l'orbe, la zone de dialogue et le contexte.

```ts
type RagPhase = "idle" | "listening" | "thinking" | "speaking";

type RagEvent =
  // changement de phase (pilote l'orbe)
  | { kind: "phase"; phase: RagPhase }
  // transcription progressive de la demande vocale (STT)
  | { kind: "transcript"; text: string; final: boolean }
  // réponse de Jarvis streamée token par token (LLM)
  | { kind: "answer.delta"; text: string }
  | { kind: "answer.done" }
  // contexte documentaire courant (encadré "Current Document Context")
  | { kind: "context"; equipment: string; procedure: string; sourceId?: string }
  // amplitude audio normalisée (0–1) pour l'animation de l'orbe
  | { kind: "audio.level"; level: number };
```

Exemple de séquence (scénario de démonstration de la maquette) :

```jsonc
{ "kind": "phase",      "phase": "listening" }
{ "kind": "transcript", "text": "J'ai un problème avec l'imprimante", "final": true }
{ "kind": "phase",      "phase": "thinking" }
{ "kind": "context",    "equipment": "Toshiba e-Studio 3515ac", "procedure": "Dépannage Général" }
{ "kind": "phase",      "phase": "speaking" }
{ "kind": "answer.delta", "text": "Je consulte la BDD Bleu Citron… " }
{ "kind": "answer.delta", "text": "Quel est le code d'erreur sur l'écran (ex. E2, F5) ?" }
{ "kind": "answer.done" }
{ "kind": "phase",      "phase": "idle" }
```

---

## 7. API REST de bootstrap (agrégateur)

Endpoints minimaux exposés par l'agrégateur (le temps réel passe ensuite par le WS) :

| Méthode | Chemin                | Description |
|---------|-----------------------|-------------|
| `GET`   | `/api/snapshot`       | État complet `DashboardState` (fallback si le WS n'est pas encore prêt). |
| `GET`   | `/api/health`         | Santé de l'agrégateur et des connecteurs. |
| `GET`   | `/ws`                 | Mise à niveau WebSocket (flux temps réel). |
| `GET`   | `/api/projects`       | Liste éditable des projets (source gérée à la main) + panneau courant. |
| `PUT`   | `/api/projects`       | Remplace la liste (corps `{ projects: ProjectInput[] }`), réécrit le fichier source, diffuse un `panel.update`. `422` si invalide. |
| `POST`  | `/api/rag/voice`      | (interne) flux audio entrant du micro → service RAG. |
| `POST`  | `/api/rag/reindex`    | (interne/admin) déclenche la ré-indexation de la base documentaire. |

Tous les schémas ci-dessus sont versionnés : tout changement incompatible incrémente
un champ `schemaVersion` dans `snapshot` pour permettre une montée de version coordonnée front/back.
