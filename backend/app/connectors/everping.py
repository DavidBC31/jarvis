"""Connecteur Everping (P1) — tickets de support.

Everping n'expose pas d'API publique, mais la plateforme web (appv2.everping.eu)
s'appuie sur une **API GraphQL privée** authentifiée par **Firebase Auth** (SSO
Google). On rejoue donc, côté serveur, l'appel `TicketsPage` que fait le client
web, en s'authentifiant avec un **ID token Firebase**.

Autonomie : un ID token expire en ~1 h. Si l'on dispose d'un **refresh token**
Firebase (capturé une fois après connexion SSO), on régénère les ID tokens
indéfiniment via `securetoken.googleapis.com` — aucun navigateur requis ensuite.

Configuration (variables d'environnement) :
- ``EVERPING_REFRESH_TOKEN`` : refresh token Firebase (recommandé, auto-renouvelé) ;
- ``EVERPING_ID_TOKEN``      : ID token direct (dépannage, expire en ~1 h) ;
- ``EVERPING_CLIENT_ID``     : id du client Everping (défaut : Bleu Citron) ;
- ``EVERPING_API_KEY``       : clé web Firebase (publique) ;
- ``EVERPING_GRAPHQL_URL``   : endpoint GraphQL.

Sans credentials, le connecteur sert un échantillon anonymisé (mode démo).
"""

from __future__ import annotations

import json
import os
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

SAMPLE_FILE = Path(__file__).resolve().parents[2] / "data" / "everping_sample.json"

DEFAULT_GRAPHQL_URL = "https://nest-backend-prod-yhodaefzgq-od.a.run.app/graphql"
DEFAULT_CLIENT_ID = "ecd0193d-58da-429c-b61a-e6c849e8ed4d"
DEFAULT_API_KEY = "AIzaSyAd5N8EHPXsz5fvVxSScxvoelFcwo2GwzQ"  # clé web Firebase (publique)
SECURETOKEN_URL = "https://securetoken.googleapis.com/v1/token"

# Requête exacte utilisée par le client web (sous-ensemble suffisant au dashboard).
_TICKETS_QUERY = (
    "query TicketsPage($getTicketsInput: GetTicketsInput!) {\n"
    "  ticketsPage(getTicketsInput: $getTicketsInput) {\n"
    "    tickets { id status type category application topic lastMessageAt firstMessageAt "
    "messageCount user { name email } technicianOwners { name } __typename }\n"
    "    totalNb __typename\n"
    "  }\n"
    "}"
)

# Everping -> contrat interne (docs/MODELES_DONNEES.md).
_STATUS_MAP = {
    "New": "new",
    "Open": "in_progress",
    "InProgress": "in_progress",
    "Scheduled": "in_progress",
    "WaitingCustomer": "on_hold",
    "WaitingForCustomer": "on_hold",
    "NoAnswer": "on_hold",
    "OnHold": "on_hold",
    "Resolved": "resolved",
    "Done": "closed",
    "Closed": "closed",
}
_DONE = {"resolved", "closed"}

_token_cache: dict = {"id_token": None, "exp": 0.0}
_last_good: dict | None = None


class NoCredentials(Exception):
    """Aucun token/refresh token configuré."""


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def has_credentials() -> bool:
    return bool(os.getenv("EVERPING_REFRESH_TOKEN") or os.getenv("EVERPING_ID_TOKEN"))


# --- Authentification Firebase ----------------------------------------------


def _api_key() -> str:
    return os.getenv("EVERPING_API_KEY", DEFAULT_API_KEY)


def _refresh_id_token(refresh_token: str) -> tuple[str, float]:
    """Échange un refresh token contre un ID token frais. Renvoie (token, exp_epoch)."""
    data = urllib.parse.urlencode(
        {"grant_type": "refresh_token", "refresh_token": refresh_token}
    ).encode()
    req = urllib.request.Request(
        f"{SECURETOKEN_URL}?key={_api_key()}",
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        payload = json.loads(resp.read())
    token = payload["id_token"]
    ttl = float(payload.get("expires_in", 3600))
    return token, time.time() + ttl - 60  # marge de 60 s


def _id_token() -> str:
    """ID token courant : direct, ou régénéré via refresh token (avec cache)."""
    direct = os.getenv("EVERPING_ID_TOKEN")
    if direct:
        return direct
    rt = os.getenv("EVERPING_REFRESH_TOKEN")
    if not rt:
        raise NoCredentials("ni EVERPING_ID_TOKEN ni EVERPING_REFRESH_TOKEN défini")
    if _token_cache["id_token"] and time.time() < _token_cache["exp"]:
        return _token_cache["id_token"]
    token, exp = _refresh_id_token(rt)
    _token_cache["id_token"], _token_cache["exp"] = token, exp
    return token


# --- Récupération + normalisation -------------------------------------------


def fetch_tickets_raw(page_size: int = 30) -> list[dict]:
    """Appel GraphQL authentifié. Lève NoCredentials / Exception réseau."""
    token = _id_token()
    client_id = os.getenv("EVERPING_CLIENT_ID", DEFAULT_CLIENT_ID)
    body = json.dumps(
        {
            "operationName": "TicketsPage",
            "variables": {
                "getTicketsInput": {
                    "pageNb": 0,
                    "pageSize": page_size,
                    "statuses": [],
                    "types": [],
                    "applicationNames": [],
                    "dateOperator": "Equals",
                    "sortDirection": "Desc",
                    "sortBy": "lastMessageAt",
                    "clientId": client_id,
                }
            },
            "query": _TICKETS_QUERY,
        }
    ).encode()
    req = urllib.request.Request(
        os.getenv("EVERPING_GRAPHQL_URL", DEFAULT_GRAPHQL_URL),
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
            "application": "platform",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        payload = json.loads(resp.read())
    if "errors" in payload:
        raise RuntimeError(f"GraphQL: {payload['errors']}")
    return payload["data"]["ticketsPage"]["tickets"]


def _priority_for(status: str, raw: dict) -> str:
    if status in _DONE:
        return "low"
    topic = (raw.get("topic") or "")
    if raw.get("type") == "SupportIssue" or topic.startswith("Incident"):
        return "high"
    return "medium"


def normalize_tickets(raw_tickets: list[dict]) -> dict:
    """Transforme la réponse Everping en panneau Tickets (contrat interne)."""
    tickets = []
    counts: dict[str, int] = {}
    for r in raw_tickets:
        status = _STATUS_MAP.get(r.get("status", ""), "in_progress")
        owners = r.get("technicianOwners") or []
        subject = (r.get("topic") or r.get("category") or "(sans sujet)").strip()
        ticket = {
            "id": "EVP-" + str(r.get("id", ""))[-6:],
            "subject": subject,
            "status": status,
            "assignedTo": owners[0]["name"] if owners else None,
            "priority": _priority_for(status, r),
            "updatedAt": r.get("lastMessageAt") or _now_iso(),
        }
        tickets.append(ticket)
        counts[status] = counts.get(status, 0) + 1

    # Feed : tickets ouverts d'abord, puis les plus récents (tris stables).
    tickets.sort(key=lambda t: t["updatedAt"], reverse=True)
    tickets.sort(key=lambda t: t["status"] in _DONE)
    return {"tickets": tickets, "statusCounts": counts, "total": len(tickets)}


# --- Construction du panneau -------------------------------------------------


def _load_sample() -> list[dict]:
    try:
        return json.loads(SAMPLE_FILE.read_text("utf-8")).get("tickets", [])
    except (OSError, json.JSONDecodeError):
        return []


def _panel(norm: dict, *, source: str, stale: bool = False, error: str | None = None) -> dict:
    panel = {"updatedAt": _now_iso(), "stale": stale, "source": source, **norm}
    if error:
        panel["sourceError"] = error
    return panel


def seed_panel() -> dict:
    """Panneau initial sans réseau (échantillon ou dernier état valide)."""
    if _last_good:
        return {**_last_good, "updatedAt": _now_iso()}
    return _panel(normalize_tickets(_load_sample()), source="sample")


def build_panel() -> dict:
    """Récupère les tickets en direct si credentials, sinon échantillon. En cas
    d'erreur réseau, conserve le dernier état valide et marque ``stale``."""
    global _last_good
    if not has_credentials():
        return _panel(normalize_tickets(_load_sample()), source="sample")
    try:
        panel = _panel(normalize_tickets(fetch_tickets_raw()), source="live")
        _last_good = panel
        return panel
    except NoCredentials:
        return _panel(normalize_tickets(_load_sample()), source="sample")
    except Exception as e:  # réseau, token, GraphQL…
        base = _last_good or _panel(normalize_tickets(_load_sample()), source="sample")
        return {**base, "updatedAt": _now_iso(), "stale": True, "sourceError": str(e)}


def mode() -> str:
    return "live" if has_credentials() else "sample"
