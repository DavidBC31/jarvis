"""Connecteur Feuille de route (P4) — refonte de l'outil métier.

Source de vérité : un fichier JSON éditable (``backend/data/roadmap.json``),
monté en volume Docker. Les dates bougent souvent (rendez-vous à caler, lots
qui glissent) : le fichier est rechargé à chaud, sans redéploiement.

Le connecteur ne fait que lire, valider le minimum et dater le panneau ; toute
la mise en forme est côté écran.
"""

from __future__ import annotations

import json
import logging
from datetime import date, datetime, timezone
from pathlib import Path

DATA_FILE = Path(__file__).resolve().parents[2] / "data" / "roadmap.json"

_log = logging.getLogger(__name__)
_last_mtime: float | None = None
_last_good: dict | None = None

# Clés minimales attendues : sans elles l'écran n'a rien à tracer.
_REQUIRED = ("start", "end", "milestones")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _check_date(value: str, where: str) -> None:
    try:
        date.fromisoformat(value)
    except (ValueError, TypeError) as e:
        raise ValueError(f"date invalide ({where}) : {value!r}") from e


def _read() -> dict:
    """Lit et valide le fichier. Lève ValueError sur contenu inexploitable."""
    if not DATA_FILE.exists():
        raise ValueError(f"fichier introuvable : {DATA_FILE}")
    try:
        raw = json.loads(DATA_FILE.read_text("utf-8"))
    except json.JSONDecodeError as e:
        raise ValueError(f"JSON invalide : {e}") from e
    if not isinstance(raw, dict):
        raise ValueError("racine attendue : un objet")
    for key in _REQUIRED:
        if key not in raw:
            raise ValueError(f'clé "{key}" manquante')

    _check_date(raw["start"], "start")
    _check_date(raw["end"], "end")
    if date.fromisoformat(raw["end"]) <= date.fromisoformat(raw["start"]):
        raise ValueError("end doit être postérieur à start")

    # Les dates des points sont vérifiées pour éviter un écran muet côté front.
    for key in ("milestones", "codir", "meetings"):
        for item in raw.get(key) or []:
            _check_date(item.get("date"), f"{key} · {item.get('label', '?')}")
    for bar in (raw.get("construction") or {}).get("bars") or []:
        _check_date(bar.get("start"), f"construction · {bar.get('label', '?')}")
        _check_date(bar.get("end"), f"construction · {bar.get('label', '?')}")
    for period in raw.get("periods") or []:
        _check_date(period.get("start"), f"periods · {period.get('label', '?')}")
        _check_date(period.get("end"), f"periods · {period.get('label', '?')}")

    return raw


def build_panel() -> dict:
    """Panneau Feuille de route. En cas d'erreur, conserve le dernier état
    valide et marque ``stale`` + ``sourceError``."""
    global _last_good
    try:
        raw = _read()
        _last_good = raw
        return {"updatedAt": _now_iso(), "stale": False, **raw}
    except ValueError as e:
        _log.error("roadmap.json invalide, panneau figé : %s", e)
        base = _last_good or {"start": None, "end": None, "milestones": []}
        return {"updatedAt": _now_iso(), "stale": True, "sourceError": str(e), **base}


def seed_panel() -> dict:
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
