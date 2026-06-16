"""État du dashboard Jarvis — données normalisées (contrat camelCase).

Brique 1 : l'état est seedé en mémoire avec des données d'exemple conformes à
`docs/MODELES_DONNEES.md`. Les connecteurs réels (Everping, Jira/Trello,
Nagios/Zabbix, RAG) viendront remplacer ces fonctions de seed/simulation.
"""

from __future__ import annotations

import random
from datetime import datetime, timezone

from .connectors import projects as projects_conn
from .connectors import monitoring as monitoring_conn

try:  # métriques système réelles si psutil est disponible
    import psutil

    psutil.cpu_percent(interval=None)  # amorce la mesure (1er appel = 0.0)
except Exception:  # pragma: no cover - dépend de l'environnement
    psutil = None


def read_system_metrics() -> dict:
    """Métriques de la machine hôte (Mac Studio en prod). Utilise psutil si
    présent, sinon des valeurs simulées."""
    if psutil is None:
        return {
            "temperatureC": round(40 + random.uniform(0, 8), 1),
            "cpuLoadPercent": round(12 + random.uniform(0, 30), 1),
            "ramUsedPercent": round(45 + random.uniform(0, 10), 1),
        }
    temp = None
    try:
        sensors = psutil.sensors_temperatures()  # absent sur macOS/Windows
        for entries in sensors.values():
            if entries:
                temp = round(entries[0].current, 1)
                break
    except Exception:
        temp = None
    return {
        "temperatureC": temp if temp is not None else round(40 + random.uniform(0, 5), 1),
        "cpuLoadPercent": round(psutil.cpu_percent(interval=None), 1),
        "ramUsedPercent": round(psutil.virtual_memory().percent, 1),
    }

SCHEMA_VERSION = 1


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _meta(stale: bool = False, error: str | None = None) -> dict:
    meta = {"updatedAt": _now_iso(), "stale": stale}
    if error:
        meta["sourceError"] = error
    return meta


# --- Seeds par panneau ------------------------------------------------------


def seed_tickets() -> dict:
    tickets = [
        {"id": "EVP-10293", "subject": "Imprimante 2e étage hors ligne",
         "status": "in_progress", "assignedTo": "M. Durand", "priority": "high",
         "updatedAt": _now_iso()},
        {"id": "EVP-10288", "subject": "Demande accès VPN nouveau collaborateur",
         "status": "new", "assignedTo": None, "priority": "medium",
         "updatedAt": _now_iso()},
        {"id": "EVP-10275", "subject": "Migration boîte mail direction",
         "status": "on_hold", "assignedTo": "S. Petit", "priority": "urgent",
         "updatedAt": _now_iso()},
        {"id": "EVP-10270", "subject": "Lenteur partage de fichiers",
         "status": "in_progress", "assignedTo": "L. Bernard", "priority": "medium",
         "updatedAt": _now_iso()},
        {"id": "EVP-10261", "subject": "Mise à jour licence Office",
         "status": "new", "assignedTo": None, "priority": "low",
         "updatedAt": _now_iso()},
    ]
    counts: dict[str, int] = {}
    for t in tickets:
        counts[t["status"]] = counts.get(t["status"], 0) + 1
    return {**_meta(), "tickets": tickets, "statusCounts": counts, "total": len(tickets)}


def seed_projects() -> dict:
    # Panneau Projets (P2) : source gérée à la main via le connecteur.
    return projects_conn.build_panel()


def seed_services() -> dict:
    # Panneau Services (P3) : topologie + sondes gérées par le connecteur
    # monitoring. Seed sans sonde (les états réels arrivent au 1er passage).
    return monitoring_conn.seed_panel()


def seed_footer() -> dict:
    healthy = True  # dérivé de l'état agrégé du panneau 3 (cf. recompute_footer_health)
    return {
        **_meta(),
        "globalStatus": {
            "label": "ALL CRITICAL SERVICES OPERATIONAL",
            "healthy": healthy,
            "uptimePercent": 98.5,
        },
        "macStudio": read_system_metrics(),
        "activityStream": [
            {"id": "act-1", "at": _now_iso(), "label": "Service Alert VPN",
             "severity": "warn"},
            {"id": "act-2", "at": _now_iso(), "label": "Ticket EVP-10293 assigné",
             "severity": "info"},
        ],
    }


# --- État global ------------------------------------------------------------


def initial_state() -> dict:
    return {
        "schemaVersion": SCHEMA_VERSION,
        "serverTime": _now_iso(),
        "tickets": seed_tickets(),
        "projects": seed_projects(),
        "services": seed_services(),
        "footer": seed_footer(),
    }


STATE: dict = initial_state()


def _recompute_footer_health() -> None:
    """La barre d'état globale est dérivée de l'état des services critiques (P3)."""
    states = [n["state"] for n in STATE["services"]["nodes"]]
    healthy = "alert" not in states
    gs = STATE["footer"]["globalStatus"]
    gs["healthy"] = healthy
    gs["label"] = (
        "ALL CRITICAL SERVICES OPERATIONAL" if healthy
        else "SERVICE DISRUPTION DETECTED"
    )


def recompute_footer_health() -> None:
    """Recalcule la santé globale (appelée par le connecteur monitoring)."""
    _recompute_footer_health()


def tick() -> dict:
    """Avance l'horloge serveur et applique une légère variation (simulation).

    Renvoie l'état complet (snapshot) à diffuser. À terme, ce sont les
    connecteurs qui muteront l'état et déclencheront des `panel.update` ciblés.
    """
    STATE["serverTime"] = _now_iso()
    STATE["footer"]["macStudio"] = read_system_metrics()
    STATE["footer"]["updatedAt"] = _now_iso()

    _recompute_footer_health()
    return STATE
