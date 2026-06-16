"""Agrégateur Jarvis — point d'entrée FastAPI.

Brique 1 (socle) :
- sert la SPA buildée (si présente dans ``frontend/dist``) ;
- expose le bootstrap REST (`/api/snapshot`, `/api/health`) ;
- expose le hub WebSocket (`/ws`) qui pousse l'état temps réel ;
- une tâche de fond diffuse périodiquement un snapshot (simulation).
"""

from __future__ import annotations

import asyncio
import contextlib
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from pydantic import BaseModel, Field

from .hub import Hub
from . import state as state_module
from .connectors import projects as projects_conn
from .connectors import monitoring as monitoring_conn
from .connectors import everping as everping_conn
from .connectors.projects import ProjectsPayload
from .rag import service as rag_service
from .rag import store as rag_store
from .rag import llm as rag_llm


class AskPayload(BaseModel):
    question: str = Field(min_length=1, max_length=2000)

# Intervalle de diffusion du snapshot (secondes). Les vrais connecteurs
# pousseront des `panel.update` ciblés à leurs propres cadences.
BROADCAST_INTERVAL_S = 5.0
# Cadence de surveillance des fichiers gérés à la main (projets, monitoring).
PROJECTS_WATCH_INTERVAL_S = 2.0
MONITORING_WATCH_INTERVAL_S = 2.0
# Cadence de rafraîchissement des tickets Everping (si credentials configurés).
EVERPING_POLL_INTERVAL_S = 60.0

hub = Hub()
FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"


async def refresh_projects(force: bool = False) -> dict | None:
    """Recharge le panneau Projets si le fichier a changé (ou si `force`),
    met à jour l'état et pousse un `panel.update` ciblé."""
    if projects_conn.poll_changed() or force:
        panel = projects_conn.build_panel()
        state_module.STATE["projects"] = panel
        await hub.broadcast({"type": "panel.update", "panel": "projects", "data": panel})
        return panel
    return None


async def refresh_monitoring() -> dict:
    """Sonde les services, met à jour l'état + la santé globale, diffuse l'update."""
    panel = await monitoring_conn.check_all()
    state_module.STATE["services"] = panel
    state_module.recompute_footer_health()
    await hub.broadcast({"type": "panel.update", "panel": "services", "data": panel})
    return panel


async def refresh_everping() -> dict:
    """Récupère les tickets Everping (hors boucle événementielle) et diffuse l'update."""
    panel = await asyncio.to_thread(everping_conn.build_panel)
    state_module.STATE["tickets"] = panel
    await hub.broadcast({"type": "panel.update", "panel": "tickets", "data": panel})
    return panel


async def _broadcaster() -> None:
    """Boucle de fond : avance l'état et diffuse un snapshot aux écrans."""
    while True:
        await asyncio.sleep(BROADCAST_INTERVAL_S)
        snapshot = state_module.tick()
        await hub.broadcast({"type": "snapshot", "data": snapshot})


async def _projects_watcher() -> None:
    """Surveille le fichier projets géré à la main et pousse les changements."""
    projects_conn.poll_changed()  # synchronise le mtime initial (déjà chargé au boot)
    while True:
        await asyncio.sleep(PROJECTS_WATCH_INTERVAL_S)
        await refresh_projects()


async def _everping_watcher() -> None:
    """Rafraîchit périodiquement les tickets Everping (si credentials)."""
    while True:
        await asyncio.sleep(EVERPING_POLL_INTERVAL_S)
        if everping_conn.has_credentials():
            with contextlib.suppress(Exception):
                await refresh_everping()


async def _monitoring_watcher() -> None:
    """Re-sonde les services périodiquement (cadence de la config) et dès que le
    fichier de config change."""
    loop = asyncio.get_event_loop()
    monitoring_conn.poll_changed()  # mtime initial
    last_check = loop.time()
    while True:
        await asyncio.sleep(MONITORING_WATCH_INTERVAL_S)
        changed = monitoring_conn.poll_changed()
        due = (loop.time() - last_check) >= monitoring_conn.interval_seconds()
        if changed or due:
            await refresh_monitoring()
            last_check = loop.time()


@contextlib.asynccontextmanager
async def lifespan(_: FastAPI):
    rag_store.reindex()  # construit l'index documentaire au démarrage
    await refresh_monitoring()  # première sonde réelle des services
    if everping_conn.has_credentials():
        with contextlib.suppress(Exception):
            await refresh_everping()  # première récupération des tickets réels
    tasks = [
        asyncio.create_task(_broadcaster()),
        asyncio.create_task(_projects_watcher()),
        asyncio.create_task(_monitoring_watcher()),
        asyncio.create_task(_everping_watcher()),
    ]
    try:
        yield
    finally:
        for task in tasks:
            task.cancel()
        for task in tasks:
            with contextlib.suppress(asyncio.CancelledError):
                await task


app = FastAPI(title="Jarvis Aggregator", version="0.1.0", lifespan=lifespan)

# En dev, le frontend tourne sur le serveur Vite (port 5173) et proxifie /api
# et /ws. CORS large est acceptable sur le LAN interne ; à restreindre en prod.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health() -> JSONResponse:
    return JSONResponse(
        {
            "status": "ok",
            "screens": hub.count,
            "serverTime": state_module.STATE["serverTime"],
            "connectors": {
                "everping": everping_conn.mode(),
                "projects": "manual_file",
                "monitoring": monitoring_conn.mode(),
                "rag": {"mode": rag_llm.mode(), "chunks": rag_store.chunk_count()},
            },
        }
    )


@app.get("/api/snapshot")
async def snapshot() -> JSONResponse:
    return JSONResponse({"type": "snapshot", "data": state_module.STATE})


@app.get("/api/projects")
async def get_projects() -> JSONResponse:
    """Liste éditable des projets (source gérée à la main) + état du panneau."""
    return JSONResponse(
        {"projects": projects_conn.read_inputs_raw(), "panel": state_module.STATE["projects"]}
    )


@app.put("/api/projects")
async def put_projects(payload: ProjectsPayload) -> JSONResponse:
    """Remplace la liste des projets, réécrit le fichier source, diffuse l'update."""
    try:
        projects_conn.write_projects(payload.projects)
    except ValueError as e:
        return JSONResponse({"error": str(e)}, status_code=422)
    panel = await refresh_projects(force=True)
    return JSONResponse({"panel": panel})


@app.get("/api/monitoring")
async def get_monitoring() -> JSONResponse:
    """Config de supervision éditable + panneau courant."""
    return JSONResponse(
        {"config": monitoring_conn.read_config_raw(), "panel": state_module.STATE["services"]}
    )


@app.put("/api/monitoring")
async def put_monitoring(config: dict) -> JSONResponse:
    """Remplace la config de supervision, re-sonde et diffuse l'update."""
    try:
        monitoring_conn.write_config(config)
    except ValueError as e:
        return JSONResponse({"error": str(e)}, status_code=422)
    panel = await refresh_monitoring()
    return JSONResponse({"panel": panel})


@app.post("/api/monitoring/check")
async def post_monitoring_check() -> JSONResponse:
    """Force une re-sonde immédiate de tous les services."""
    panel = await refresh_monitoring()
    return JSONResponse({"panel": panel})


@app.get("/api/everping")
async def get_everping() -> JSONResponse:
    """Diagnostic Everping : mode courant + panneau (avec `sourceError` si échec)."""
    return JSONResponse({"mode": everping_conn.mode(), "panel": state_module.STATE["tickets"]})


@app.post("/api/everping/refresh")
async def post_everping_refresh() -> JSONResponse:
    """Force une récupération Everping immédiate (test du token / diagnostic)."""
    panel = await refresh_everping()
    return JSONResponse({"mode": everping_conn.mode(), "panel": panel})


@app.post("/api/rag/ask")
async def rag_ask(payload: AskPayload) -> JSONResponse:
    """Pose une question au RAG : récupération + génération, diffusion des
    `rag.event` aux écrans, et renvoi de la réponse complète."""
    result = await rag_service.ask(payload.question, hub.broadcast)
    return JSONResponse(result)


@app.post("/api/rag/reindex")
async def rag_reindex() -> JSONResponse:
    """Réindexe la base documentaire (après ajout/modif de documents)."""
    n = rag_store.reindex()
    return JSONResponse({"chunks": n, "mode": rag_llm.mode()})


@app.websocket("/ws")
async def ws(websocket: WebSocket) -> None:
    await hub.connect(websocket)
    # Amorçage : snapshot complet dès la connexion.
    await websocket.send_json({"type": "snapshot", "data": state_module.STATE})
    try:
        while True:
            # Pas de protocole entrant en brique 1 ; on garde la socket ouverte.
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await hub.disconnect(websocket)


# Sert la SPA buildée si disponible (montée en dernier pour ne pas masquer /api).
if FRONTEND_DIST.is_dir():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="spa")
