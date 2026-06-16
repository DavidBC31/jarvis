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

from .hub import Hub
from . import state as state_module
from .connectors import projects as projects_conn
from .connectors.projects import ProjectsPayload

# Intervalle de diffusion du snapshot (secondes). Les vrais connecteurs
# pousseront des `panel.update` ciblés à leurs propres cadences.
BROADCAST_INTERVAL_S = 5.0
# Cadence de surveillance du fichier projets géré à la main.
PROJECTS_WATCH_INTERVAL_S = 2.0

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


@contextlib.asynccontextmanager
async def lifespan(_: FastAPI):
    tasks = [
        asyncio.create_task(_broadcaster()),
        asyncio.create_task(_projects_watcher()),
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
                # Brique 1 : connecteurs encore simulés.
                "everping": "simulated",
                "projects": "simulated",
                "monitoring": "simulated",
                "rag": "not_started",
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
