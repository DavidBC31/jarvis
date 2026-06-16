"""Connecteur Monitoring (P3) — supervision autonome des services.

Contrairement aux tickets (Everping) qui dépendent d'une API tierce, la
supervision est entièrement de notre ressort : l'agrégateur **effectue
lui-même** des sondes de disponibilité (`http`/`tcp`), complétées par des
nœuds `self` (cet agrégateur) et `manual` (état fixe). La topologie est décrite
dans un fichier éditable (``backend/data/monitoring.json``), rechargé à chaud.

Le panneau produit respecte le contrat `docs/MODELES_DONNEES.md`
(`nodes`/`links`/`summary`), avec une `latencyMs` indicative par nœud sondé.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

DATA_FILE = Path(__file__).resolve().parents[2] / "data" / "monitoring.json"
DEFAULT_INTERVAL_S = 15.0
VALID_STATES = {"ok", "warn", "alert", "maint"}
_STATE_LABELS = {"maint": "MAINT [Orange]", "alert": "ALERT [Red]", "warn": "WARN [Yellow]"}

_last_mtime: float | None = None
_last_good_panel: dict | None = None


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# --- Chargement / validation de la config -----------------------------------


def load_config() -> dict:
    """Lit la config (nodes/links/interval). Lève ValueError si invalide."""
    if not DATA_FILE.exists():
        raise ValueError(f"fichier introuvable : {DATA_FILE}")
    try:
        raw = json.loads(DATA_FILE.read_text("utf-8"))
    except json.JSONDecodeError as e:
        raise ValueError(f"JSON invalide : {e}") from e
    if not isinstance(raw, dict) or not isinstance(raw.get("nodes"), list):
        raise ValueError('clé racine "nodes" (liste) manquante')

    nodes: list[dict] = []
    seen: set[str] = set()
    for n in raw["nodes"]:
        if not isinstance(n, dict) or not n.get("id"):
            raise ValueError("nœud sans 'id'")
        if n["id"] in seen:
            raise ValueError(f"id de nœud dupliqué : {n['id']}")
        seen.add(n["id"])
        check = n.get("check") or {"type": "manual", "state": "ok"}
        ctype = check.get("type", "manual")
        if ctype not in {"http", "https", "tcp", "self", "manual"}:
            raise ValueError(f"type de check inconnu : {ctype} (nœud {n['id']})")
        if ctype == "manual" and check.get("state", "ok") not in VALID_STATES:
            raise ValueError(f"state manuel invalide pour {n['id']}")
        if ctype in {"http", "https", "tcp"} and not check.get("target"):
            raise ValueError(f"'target' requis pour le check {ctype} (nœud {n['id']})")
        nodes.append({**n, "check": check})

    return {
        "intervalSeconds": float(raw.get("intervalSeconds", DEFAULT_INTERVAL_S)),
        "nodes": nodes,
        "links": raw.get("links", []),
    }


def read_config_raw() -> dict:
    """Config telle quelle pour l'API GET ({} si illisible)."""
    try:
        return json.loads(DATA_FILE.read_text("utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def write_config(raw: dict) -> None:
    """Valide puis réécrit la config. Lève ValueError si invalide."""
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = DATA_FILE.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(raw, ensure_ascii=False, indent=2) + "\n", "utf-8")
    # valide en lisant depuis le tampon avant de remplacer le fichier réel
    backup = DATA_FILE.read_bytes() if DATA_FILE.exists() else None
    tmp.replace(DATA_FILE)
    try:
        load_config()
    except ValueError:
        if backup is not None:
            DATA_FILE.write_bytes(backup)
        else:
            DATA_FILE.unlink(missing_ok=True)
        raise


def interval_seconds() -> float:
    try:
        return load_config()["intervalSeconds"]
    except ValueError:
        return DEFAULT_INTERVAL_S


# --- Sondes ------------------------------------------------------------------


async def _probe(node: dict) -> tuple[str, str | None, float | None]:
    """Renvoie (state, detail, latencyMs) pour un nœud."""
    check = node.get("check", {})
    ctype = check.get("type", "manual")

    if ctype == "manual":
        state = check.get("state", "ok")
        return (state if state in VALID_STATES else "warn", node.get("detail"), None)
    if ctype == "self":
        return ("ok", node.get("detail"), 0.0)

    target = str(check.get("target", ""))
    timeout = float(check.get("timeoutSeconds", 3.0))
    start = time.perf_counter()

    if ctype == "tcp":
        host, _, port = target.partition(":")
        try:
            fut = asyncio.open_connection(host, int(port or 0))
            _, writer = await asyncio.wait_for(fut, timeout)
            writer.close()
            with contextlib.suppress(Exception):
                await writer.wait_closed()
            return ("ok", None, round((time.perf_counter() - start) * 1000, 1))
        except Exception as e:  # connexion refusée, DNS, timeout…
            return ("alert", f"{type(e).__name__}: {e}", None)

    # http / https
    def _do() -> int:
        req = urllib.request.Request(
            target, method="GET", headers={"User-Agent": "Jarvis-Monitor"}
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.status
        except urllib.error.HTTPError as e:
            return e.code

    try:
        status = await asyncio.to_thread(_do)
        ms = round((time.perf_counter() - start) * 1000, 1)
        if status >= 500:
            return ("alert", f"HTTP {status}", ms)
        if status >= 400:
            return ("warn", f"HTTP {status}", ms)
        return ("ok", None, ms)
    except Exception as e:
        return ("alert", f"{type(e).__name__}: {e}", None)


def _summary(nodes: list[dict]) -> list[str]:
    lines = []
    for n in nodes:
        if n["state"] in _STATE_LABELS:
            line = f'{n["label"]}: {_STATE_LABELS[n["state"]]}'
            if n.get("detail"):
                line += f' — {n["detail"]}'
            lines.append(line)
    return lines


def _node_view(cfg_node: dict, state: str, detail: str | None, ms: float | None) -> dict:
    node = {"id": cfg_node["id"], "label": cfg_node.get("label", cfg_node["id"]), "state": state}
    if cfg_node.get("x") is not None:
        node["x"] = cfg_node["x"]
    if cfg_node.get("y") is not None:
        node["y"] = cfg_node["y"]
    d = detail or cfg_node.get("detail")
    if d:
        node["detail"] = d
    if ms is not None:
        node["latencyMs"] = ms
    return node


async def check_all() -> dict:
    """Sonde tous les nœuds (en parallèle) et construit le panneau. En cas de
    config illisible, conserve le dernier panneau valide et marque ``stale``."""
    global _last_good_panel
    try:
        cfg = load_config()
    except ValueError as e:
        base = _last_good_panel or {"nodes": [], "links": [], "summary": []}
        return {**base, "updatedAt": _now_iso(), "stale": True, "sourceError": str(e)}

    results = await asyncio.gather(*(_probe(n) for n in cfg["nodes"]))
    nodes = [_node_view(n, *r) for n, r in zip(cfg["nodes"], results)]
    panel = {
        "updatedAt": _now_iso(),
        "stale": False,
        "nodes": nodes,
        "links": cfg["links"],
        "summary": _summary(nodes),
    }
    _last_good_panel = panel
    return panel


def seed_panel() -> dict:
    """Panneau initial **sans sonde** (synchrone, pour le bootstrap). Les états
    réels arrivent à la première passe du watcher."""
    try:
        cfg = load_config()
    except ValueError as e:
        return {"updatedAt": _now_iso(), "stale": True, "sourceError": str(e),
                "nodes": [], "links": [], "summary": []}
    nodes = []
    for n in cfg["nodes"]:
        check = n.get("check", {})
        state = check.get("state", "ok") if check.get("type") == "manual" else "ok"
        nodes.append(_node_view(n, state, n.get("detail"), None))
    return {
        "updatedAt": _now_iso(), "stale": False,
        "nodes": nodes, "links": cfg["links"], "summary": _summary(nodes),
    }


def _current_mtime() -> float | None:
    try:
        return DATA_FILE.stat().st_mtime
    except OSError:
        return None


def poll_changed() -> bool:
    """True si le fichier de config a changé depuis le dernier appel."""
    global _last_mtime
    m = _current_mtime()
    if m != _last_mtime:
        _last_mtime = m
        return True
    return False
