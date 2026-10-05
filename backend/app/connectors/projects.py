"""Connecteur Projets (P2) — source gérée à la main.

La source de vérité est un fichier JSON éditable (``backend/data/projects.json``).
Il peut être modifié :
- directement à la main (le watcher détecte le changement et pousse un update) ;
- via l'API REST (`GET`/`PUT /api/projects`), qui valide puis réécrit le fichier.

Le connecteur valide, normalise (calcule ``overdue``, trie par priorité puis
échéance) et expose le panneau au format du contrat (`docs/MODELES_DONNEES.md`).
"""

from __future__ import annotations

import json
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field, ValidationError

KeyStatus = Literal["on_track", "at_risk", "critical", "done", "paused"]

DATA_FILE = Path(__file__).resolve().parents[2] / "data" / "projects.json"
# Historique des évolutions d'avancement (état d'exécution, non versionné).
HISTORY_FILE = DATA_FILE.with_name("progress_history.json")
HISTORY_MAX = 100     # événements conservés sur disque
RECENT_CHANGES = 5    # projets mis en avant à l'écran (les plus récemment modifiés)

# Ordre de priorité pour le tri (le plus urgent en tête).
_PRIORITY = {"critical": 0, "at_risk": 1, "on_track": 2, "paused": 3, "done": 4}

_last_mtime: float | None = None
_last_good: list[dict] | None = None  # dernier jeu de projets normalisé valide


class ProjectInput(BaseModel):
    """Forme éditée à la main / reçue par l'API (champs minimaux)."""

    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    owner: str = ""
    dueDate: str | None = None
    keyStatus: KeyStatus = "on_track"
    progress: int = Field(default=0, ge=0, le=100)
    sortOrder: int = Field(default=99, ge=0, le=999)  # priorité explicite : 1 = top, 99 = non classé

    def parsed_due(self) -> date | None:
        return date.fromisoformat(self.dueDate) if self.dueDate else None


class ProjectsPayload(BaseModel):
    """Corps attendu par `PUT /api/projects`."""

    projects: list[ProjectInput]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _normalize(items: list[ProjectInput]) -> list[dict]:
    today = date.today()
    projects = []
    for p in items:
        due = p.parsed_due()  # lève ValueError si format invalide
        overdue = bool(due and due < today and p.progress < 100)
        projects.append(
            {
                "id": p.id,
                "name": p.name,
                "owner": p.owner,
                "dueDate": p.dueDate,
                "keyStatus": p.keyStatus,
                "progress": p.progress,
                "overdue": overdue,
                "sortOrder": p.sortOrder,
            }
        )
    # Tri : ordre explicite → gravité → avancement décroissant.
    projects.sort(key=lambda x: (x["sortOrder"], _PRIORITY[x["keyStatus"]], -x["progress"]))
    return projects


def _read_inputs() -> list[ProjectInput]:
    """Lit et valide le fichier source. Lève ValueError sur contenu invalide."""
    if not DATA_FILE.exists():
        raise ValueError(f"fichier introuvable : {DATA_FILE}")
    try:
        raw = json.loads(DATA_FILE.read_text("utf-8"))
    except json.JSONDecodeError as e:
        raise ValueError(f"JSON invalide : {e}") from e
    if not isinstance(raw, dict) or "projects" not in raw:
        raise ValueError('clé racine "projects" manquante')
    try:
        return [ProjectInput(**item) for item in raw["projects"]]
    except (ValidationError, TypeError) as e:
        raise ValueError(f"projet invalide : {e}") from e


def read_inputs_raw() -> list[dict]:
    """Renvoie la liste éditable telle quelle (pour l'API GET). [] si illisible."""
    try:
        return [p.model_dump() for p in _read_inputs()]
    except ValueError:
        return []


# --- Historique des évolutions d'avancement ---------------------------------


def _load_history() -> dict | None:
    try:
        h = json.loads(HISTORY_FILE.read_text("utf-8"))
        if isinstance(h.get("snapshot"), dict) and isinstance(h.get("changes"), list):
            return h
    except (OSError, json.JSONDecodeError, AttributeError):
        pass
    return None


def _track_progress(projects: list[dict]) -> list[dict]:
    """Compare l'avancement à la dernière valeur connue, journalise chaque
    changement et renvoie l'historique. Couvre l'admin comme l'édition manuelle
    du fichier. Au tout premier passage, seule la référence est enregistrée."""
    current = {p["id"]: p["progress"] for p in projects}
    history = _load_history()
    if history is None:
        history = {"snapshot": current, "changes": []}
    else:
        now = _now_iso()
        for pid, to in current.items():
            frm = history["snapshot"].get(pid)
            if frm is not None and frm != to:
                history["changes"].append({"id": pid, "from": frm, "to": to, "at": now})
        if current == history["snapshot"]:
            return history["changes"]
        history["snapshot"] = current
        history["changes"] = history["changes"][-HISTORY_MAX:]
    try:
        HISTORY_FILE.write_text(json.dumps(history, ensure_ascii=False, indent=2) + "\n", "utf-8")
    except OSError:
        pass  # l'historique est un bonus : on n'empêche jamais l'affichage
    return history["changes"]


def _attach_recent_changes(projects: list[dict], changes: list[dict]) -> None:
    """Ajoute ``change`` aux projets dont l'avancement a bougé le plus récemment
    (dernier changement de chacun, sur les RECENT_CHANGES projets les plus récents)."""
    by_id = {p["id"]: p for p in projects}
    seen: set[str] = set()
    for c in reversed(changes):
        if c["id"] in seen or c["id"] not in by_id:
            continue
        seen.add(c["id"])
        by_id[c["id"]]["change"] = {
            "from": c["from"], "to": c["to"], "delta": c["to"] - c["from"], "at": c["at"],
        }
        if len(seen) >= RECENT_CHANGES:
            break


def build_panel() -> dict:
    """Construit le panneau Projets. En cas d'erreur, conserve le dernier état
    valide et marque ``stale`` + ``sourceError``."""
    global _last_good
    try:
        projects = _normalize(_read_inputs())
        _attach_recent_changes(projects, _track_progress(projects))
        _last_good = projects
        return {"updatedAt": _now_iso(), "stale": False, "projects": projects}
    except ValueError as e:
        return {
            "updatedAt": _now_iso(),
            "stale": True,
            "sourceError": str(e),
            "projects": _last_good or [],
        }


def write_projects(items: list[ProjectInput]) -> dict:
    """Valide puis réécrit le fichier source. Renvoie le panneau recalculé."""
    _normalize(items)  # validation (dates, etc.) avant écriture
    payload = {"projects": [p.model_dump() for p in items]}
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", "utf-8")
    return build_panel()


def _current_mtime() -> float | None:
    try:
        return DATA_FILE.stat().st_mtime
    except OSError:
        return None


def poll_changed() -> bool:
    """True si le fichier a changé depuis le dernier appel (et resynchronise)."""
    global _last_mtime
    m = _current_mtime()
    if m != _last_mtime:
        _last_mtime = m
        return True
    return False
