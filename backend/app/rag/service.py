"""Orchestration du RAG : récupération → contexte → génération, avec diffusion
des `rag.event` au frontend (pilote l'orbe, le dialogue, le contexte document)."""

from __future__ import annotations

import asyncio
import re
from typing import Awaitable, Callable

from . import llm, store

Broadcast = Callable[[dict], Awaitable[None]]

# Cadence d'envoi des deltas de réponse (effet "streaming" côté écran).
_DELTA_DELAY_S = 0.025


def _word_chunks(text: str) -> list[str]:
    # Regroupe par petits paquets de mots pour un rendu fluide.
    words = re.findall(r"\S+\s*", text)
    chunks, buf = [], ""
    for w in words:
        buf += w
        if len(buf) >= 18:
            chunks.append(buf)
            buf = ""
    if buf:
        chunks.append(buf)
    return chunks


async def ask(question: str, broadcast: Broadcast) -> dict:
    """Exécute le pipeline et diffuse les événements. Renvoie {answer, context}."""

    async def emit(data: dict) -> None:
        await broadcast({"type": "rag.event", "data": data})

    await emit({"kind": "transcript", "text": question, "final": True})
    await emit({"kind": "phase", "phase": "thinking"})

    passages = store.search(question, k=4)
    context = None
    if passages:
        top = passages[0]
        context = {"equipment": top["equipment"], "procedure": top["procedure"], "sourceId": top["id"]}
        await emit({"kind": "context", **context})

    # Génération (bloquante) hors de la boucle événementielle.
    answer = await asyncio.to_thread(llm.generate_answer, question, passages)

    await emit({"kind": "phase", "phase": "speaking"})
    for chunk in _word_chunks(answer):
        await emit({"kind": "answer.delta", "text": chunk})
        await asyncio.sleep(_DELTA_DELAY_S)
    await emit({"kind": "answer.done"})
    await emit({"kind": "phase", "phase": "idle"})

    return {"answer": answer, "context": context, "mode": llm.mode()}
