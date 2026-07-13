// Contrats partagés front/back — miroir de docs/MODELES_DONNEES.md

export type PanelId = "tickets" | "projects" | "services" | "footer";

export interface PanelMeta {
  updatedAt: string;
  stale: boolean;
  source?: string;
  sourceError?: string;
}

export type TicketStatus =
  | "new"
  | "in_progress"
  | "on_hold"
  | "resolved"
  | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";

export interface Ticket {
  id: string;
  subject: string;
  status: TicketStatus;
  assignedTo: string | null;
  priority: TicketPriority;
  updatedAt: string;
}

export interface TicketsPanel extends PanelMeta {
  tickets: Ticket[];
  statusCounts: Partial<Record<TicketStatus, number>>;
  total: number;
}

export type KeyStatus = "on_track" | "at_risk" | "critical" | "done" | "paused";

export interface Project {
  id: string;
  name: string;
  owner: string;
  dueDate: string | null;
  keyStatus: KeyStatus;
  progress: number;
  overdue: boolean;
  sortOrder: number; // 1 = top priorité, 99 = non classé
}

export interface ProjectsPanel extends PanelMeta {
  projects: Project[];
}

export type ServiceState = "ok" | "warn" | "alert" | "maint";

export interface ServiceNode {
  id: string;
  label: string;
  state: ServiceState;
  x?: number;
  y?: number;
  detail?: string;
  latencyMs?: number;
  uptimePercent?: number;
  beats?: ServiceState[];
}

export interface ServiceLink {
  from: string;
  to: string;
}

export interface ServicesPanel extends PanelMeta {
  nodes: ServiceNode[];
  links: ServiceLink[];
  summary: string[];
  upCount?: number;
  total?: number;
}

export interface ActivityEvent {
  id: string;
  at: string;
  label: string;
  severity: "info" | "warn" | "alert";
}

export interface FooterPanel extends PanelMeta {
  globalStatus: {
    label: string;
    healthy: boolean;
    uptimePercent: number;
  };
  macStudio: {
    temperatureC: number;
    cpuLoadPercent: number;
    ramUsedPercent?: number;
  };
  activityStream: ActivityEvent[];
}

export interface DashboardState {
  schemaVersion: number;
  serverTime: string;
  tickets: TicketsPanel;
  projects: ProjectsPanel;
  services: ServicesPanel;
  footer: FooterPanel;
}

export type RagPhase = "idle" | "listening" | "thinking" | "speaking";

export interface RagContext {
  equipment: string;
  procedure: string;
  sourceId?: string;
}

export type RagEvent =
  | { kind: "phase"; phase: RagPhase }
  | { kind: "transcript"; text: string; final: boolean }
  | { kind: "answer.delta"; text: string }
  | { kind: "answer.done" }
  | ({ kind: "context" } & RagContext)
  | { kind: "audio.level"; level: number };

export type WsMessage =
  | { type: "snapshot"; data: DashboardState }
  | { type: "panel.update"; panel: PanelId; data: unknown }
  | { type: "rag.event"; data: RagEvent };
