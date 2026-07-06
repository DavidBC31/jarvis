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

# Ordre de priorité pour le tri (le plus urgent en tête).
_PRIORITY = {"critical": 0, "at_risk": 1, "on_track": 2, "paused": 3, "done": 4}

_last_mtime: float | None = None
_last_good: list[dict] | None = None  # dernier jeu de projets normalisé valide


class ProjectInput(BaseModel):
    """Forme éditée à la main / reçue par l'API (champs minimaux)."""

    id: str = Field(min_length=1)  # matricule (ex. SI-PRO3)
    name: str = Field(min_length=1)  # intitulé du projet
    owner: str = ""  # responsable
    dueDate: str | None = None  # ISO date "YYYY-MM-DD" (optionnel)
    keyStatus: KeyStatus = "on_track"
    progress: int = Field(default=0, ge=0, le=100)

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
            }
        )
    # Tri : priorité (critique d'abord) puis échéance (sans date en dernier).
    projects.sort(key=lambda x: (_PRIORITY[x["keyStatus"]], x["dueDate"] or "9999-12-31"))
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


def build_panel() -> dict:
    """Construit le panneau Projets. En cas d'erreur, conserve le dernier état
    valide et marque ``stale`` + ``sourceError``."""
    global _last_good
    try:
        projects = _normalize(_read_inputs())
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
