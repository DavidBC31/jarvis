import { useEffect, useState } from "react";
import type { KeyStatus, Project } from "../../types";

// Ligne éditable : mêmes champs que ProjectInput côté backend (overdue est calculé).
type Row = Pick<Project, "id" | "name" | "owner" | "dueDate" | "keyStatus" | "progress" | "sortOrder">;

const KEY_STATUS: KeyStatus[] = ["on_track", "at_risk", "critical", "paused", "done"];
const KEY_LABEL: Record<KeyStatus, string> = {
  on_track: "Sur les rails",
  at_risk: "À risque",
  critical: "Critique",
  paused: "En pause",
  done: "Terminé",
};

// ── Tri du tableau (affichage seul : l'ordre enregistré n'est pas modifié) ────

type ColKey = "id" | "name" | "owner" | "dueDate" | "keyStatus" | "progress" | "sortOrder";

const COLUMNS: { key: ColKey; label: string; title?: string }[] = [
  { key: "id", label: "Matricule" },
  { key: "name", label: "Intitulé" },
  { key: "owner", label: "Responsable" },
  { key: "dueDate", label: "Échéance" },
  { key: "keyStatus", label: "Statut" },
  { key: "progress", label: "Avancement" },
  { key: "sortOrder", label: "Priorité #", title: "Ordre d'affichage (1 = prioritaire, 99 = non classé)" },
];

// Le statut se trie par gravité (comme le tri du dashboard), pas par alphabet.
const STATUS_RANK: Record<KeyStatus, number> = {
  critical: 0, at_risk: 1, on_track: 2, paused: 3, done: 4,
};

/** 1 pour une valeur vide : ces lignes restent en bas quel que soit le sens. */
function emptyRank(r: Row, key: ColKey): number {
  if (key === "progress" || key === "sortOrder" || key === "keyStatus") return 0;
  return String(r[key] ?? "").trim() ? 0 : 1;
}

function compare(a: Row, b: Row, key: ColKey): number {
  if (key === "progress" || key === "sortOrder") return a[key] - b[key];
  if (key === "keyStatus") return STATUS_RANK[a.keyStatus] - STATUS_RANK[b.keyStatus];
  if (key === "dueDate") return (a.dueDate ?? "").localeCompare(b.dueDate ?? ""); // ISO : ordre lexical = chronologique
  // numeric: SI-PRO3 avant SI-PRO11
  return a[key].localeCompare(b[key], "fr", { sensitivity: "base", numeric: true });
}

const emptyRow = (): Row => ({
  id: "",
  name: "",
  owner: "",
  dueDate: "",
  keyStatus: "on_track",
  progress: 0,
  sortOrder: 99,
});

export function AdminProjects() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [sort, setSort] = useState<{ key: ColKey; dir: "asc" | "desc" } | null>(null);

  // Clic sur un en-tête : croissant, puis décroissant, puis retour à l'ordre d'origine.
  const toggleSort = (key: ColKey) =>
    setSort((s) =>
      s?.key !== key ? { key, dir: "asc" } : s.dir === "asc" ? { key, dir: "desc" } : null,
    );

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => setRows(d.projects ?? []))
      .catch(() => setMsg({ kind: "err", text: "Impossible de charger les projets." }))
      .finally(() => setLoading(false));
  }, []);

  const update = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));
  const add = () => setRows((rs) => [...rs, emptyRow()]);

  const save = async () => {
    setMsg(null);
    setSaving(true);
    try {
      const res = await fetch("/api/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projects: rows }),
      });
      if (res.ok) {
        const d = await res.json();
        setRows(
          (d.panel?.projects ?? rows).map((p: Project) => ({
            id: p.id,
            name: p.name,
            owner: p.owner,
            dueDate: p.dueDate,
            keyStatus: p.keyStatus,
            progress: p.progress,
            sortOrder: p.sortOrder ?? 99,
          })),
        );
        setMsg({ kind: "ok", text: "Enregistré — diffusé à l'écran." });
      } else {
        const d = await res.json().catch(() => ({}));
        setMsg({ kind: "err", text: d.error ?? `Erreur ${res.status} (validation).` });
      }
    } catch {
      setMsg({ kind: "err", text: "Serveur injoignable — rien n'a été enregistré." });
    } finally {
      setSaving(false);
    }
  };

  // Vue triée qui conserve l'index d'origine : l'édition et la suppression
  // continuent de viser la bonne ligne, et l'ordre enregistré reste inchangé.
  const view = rows.map((r, i) => ({ r, i }));
  if (sort) {
    const dir = sort.dir === "asc" ? 1 : -1;
    view.sort(
      (A, B) =>
        emptyRank(A.r, sort.key) - emptyRank(B.r, sort.key) ||
        compare(A.r, B.r, sort.key) * dir ||
        A.i - B.i,
    );
  }

  return (
    <div className="h-full w-full p-6 overflow-auto">
      {/* Bandeau collant : « Enregistrer » reste accessible même en bas de liste. */}
      <div
        className="sticky top-0 z-10 flex items-center gap-4 mb-4 py-3 -mt-3"
        style={{ background: "#060B1D", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <h1 className="font-display text-xl tracking-[0.25em] neon-text">
          ADMIN · PROJETS SI
        </h1>
        {msg && (
          <span
            className="text-xs"
            style={{ color: msg.kind === "ok" ? "var(--status-ok)" : "var(--status-alert)" }}
          >
            {msg.text}
          </span>
        )}
        <div className="ml-auto flex items-center gap-4">
          <a href="#" className="text-xs tracking-widest text-neon-cyan">
            ← TABLEAU DE BORD
          </a>
          <button
            onClick={save}
            disabled={saving || loading}
            className="rounded px-4 py-1.5 text-xs tracking-widest text-bg-base font-display disabled:opacity-50"
            style={{ background: "var(--neon-cyan)" }}
          >
            {saving ? "ENREGISTREMENT…" : "ENREGISTRER"}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-text-muted text-sm">Chargement…</p>
      ) : (
        <>
          <table className="w-full text-sm border-collapse">
            <thead className="text-text-muted text-left text-xs">
              <tr>
                {COLUMNS.map((c) => {
                  const active = sort?.key === c.key;
                  return (
                    <th key={c.key} className="py-2 pr-2 font-normal">
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className="flex items-center gap-1 hover:text-white transition-colors"
                        style={{ color: active ? "var(--neon-cyan)" : undefined }}
                        title={c.title ?? `Trier par ${c.label.toLowerCase()}`}
                      >
                        {c.label}
                        <span className="text-[9px]" style={{ opacity: active ? 1 : 0.3 }}>
                          {active ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}
                        </span>
                      </button>
                    </th>
                  );
                })}
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {view.map(({ r, i }) => (
                <tr key={i} className="border-t border-white/10">
                  <td className="py-1 pr-2">
                    <input
                      className="bg-transparent neon-border rounded px-2 py-1 w-24"
                      value={r.id}
                      onChange={(e) => update(i, { id: e.target.value })}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      className="bg-transparent neon-border rounded px-2 py-1 w-full"
                      value={r.name}
                      onChange={(e) => update(i, { name: e.target.value })}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      className="bg-transparent neon-border rounded px-2 py-1 w-40"
                      value={r.owner}
                      onChange={(e) => update(i, { owner: e.target.value })}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="date"
                      className="bg-transparent neon-border rounded px-2 py-1"
                      value={r.dueDate ?? ""}
                      onChange={(e) => update(i, { dueDate: e.target.value || null })}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <select
                      className="bg-bg-base neon-border rounded px-2 py-1"
                      value={r.keyStatus}
                      onChange={(e) => update(i, { keyStatus: e.target.value as KeyStatus })}
                    >
                      {KEY_STATUS.map((s) => (
                        <option key={s} value={s}>
                          {KEY_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="bg-transparent neon-border rounded px-2 py-1 w-20"
                      value={r.progress}
                      onChange={(e) =>
                        update(i, { progress: Number(e.target.value) })
                      }
                    />
                    <span className="ml-1 text-text-muted">%</span>
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="number"
                      min={1}
                      max={999}
                      className="bg-transparent neon-border rounded px-2 py-1 w-16 text-center"
                      value={r.sortOrder}
                      title="1 = prioritaire, 99 = non classé"
                      onChange={(e) => update(i, { sortOrder: Number(e.target.value) })}
                    />
                  </td>
                  <td className="py-1">
                    <button
                      onClick={() => remove(i)}
                      className="text-status-alert text-xs px-2"
                      title="Supprimer"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={add}
              className="neon-border rounded px-3 py-1 text-xs tracking-widest"
            >
              + AJOUTER
            </button>
          </div>
          <p className="text-text-muted text-[11px] mt-3">
            Un clic sur un en-tête trie l'affichage (croissant, décroissant, puis ordre
            d'origine) ; cela ne change pas l'ordre enregistré ni l'affichage mural, piloté
            par <em>Priorité #</em>.
          </p>
          <p className="text-text-muted text-[11px] mt-1">
            « Enregistrer » remplace la liste complète, réécrit
            <code className="mx-1">backend/data/projects.json</code> et diffuse la mise à
            jour à l'écran. <code>overdue</code> est calculé automatiquement.
          </p>
        </>
      )}
    </div>
  );
}
