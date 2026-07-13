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
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

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
  };

  return (
    <div className="h-full w-full p-6 overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-xl tracking-[0.25em] neon-text">
          ADMIN · PROJETS SI
        </h1>
        <a href="#" className="text-xs tracking-widest text-neon-cyan">
          ← TABLEAU DE BORD
        </a>
      </div>

      {loading ? (
        <p className="text-text-muted text-sm">Chargement…</p>
      ) : (
        <>
          <table className="w-full text-sm border-collapse">
            <thead className="text-text-muted text-left text-xs">
              <tr>
                <th className="py-2 pr-2">Matricule</th>
                <th className="py-2 pr-2">Intitulé</th>
                <th className="py-2 pr-2">Responsable</th>
                <th className="py-2 pr-2">Échéance</th>
                <th className="py-2 pr-2">Statut</th>
                <th className="py-2 pr-2">Avancement</th>
                <th className="py-2 pr-2" title="Ordre d'affichage (1 = prioritaire, 99 = non classé)">Priorité #</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
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
            <button
              onClick={save}
              className="rounded px-4 py-1 text-xs tracking-widest text-bg-base font-display"
              style={{ background: "var(--neon-cyan)" }}
            >
              ENREGISTRER
            </button>
            {msg && (
              <span
                className="text-xs"
                style={{
                  color: msg.kind === "ok" ? "var(--status-ok)" : "var(--status-alert)",
                }}
              >
                {msg.text}
              </span>
            )}
          </div>
          <p className="text-text-muted text-[11px] mt-3">
            « Enregistrer » remplace la liste complète, réécrit
            <code className="mx-1">backend/data/projects.json</code> et diffuse la mise à
            jour à l'écran. <code>overdue</code> est calculé automatiquement.
          </p>
        </>
      )}
    </div>
  );
}
