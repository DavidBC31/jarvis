"""Génération de la réponse (QA) du RAG.

Si ``ANTHROPIC_API_KEY`` est défini, utilise Claude (``claude-opus-4-8``) via le SDK
officiel. Sinon, bascule sur un mode *stub* qui répond à partir du passage récupéré —
l'interface reste démontrable hors-ligne.
"""

from __future__ import annotations

import os
import re

MODEL = "claude-opus-4-8"

SYSTEME = (
    "Tu es Jarvis, l'assistant IT de Bleu Citron. Réponds en français, de façon "
    "concise et actionnable. Utilise EXCLUSIVEMENT le contexte documentaire fourni. "
    "Si un code d'erreur est nécessaire pour diagnostiquer, demande-le à l'utilisateur. "
    "Si l'information n'est pas dans le contexte, dis-le clairement."
)


def mode() -> str:
    """'claude' si une clé API est configurée, sinon 'stub'."""
    return "claude" if os.getenv("ANTHROPIC_API_KEY") else "stub"


def _first_sentences(text: str, n: int = 2) -> str:
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    return " ".join(sentences[:n]).strip()


def _stub_answer(question: str, passages: list[dict]) -> str:
    if not passages:
        return (
            "Je n'ai pas trouvé d'information pertinente dans la base documentaire "
            "Bleu Citron pour cette demande."
        )
    top = passages[0]
    extrait = _first_sentences(top["text"])
    return (
        f"Je consulte la BDD Bleu Citron… D'après « {top['equipment']} / "
        f"{top['procedure']} » : {extrait}"
    )


def _claude_answer(question: str, passages: list[dict]) -> str:
    import anthropic  # import paresseux : non requis en mode stub

    client = anthropic.Anthropic()
    contexte = "\n\n---\n\n".join(
        f"[{p['equipment']} / {p['procedure']}]\n{p['text']}" for p in passages
    ) or "(aucun passage pertinent trouvé)"

    resp = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        system=[{"type": "text", "text": SYSTEME, "cache_control": {"type": "ephemeral"}}],
        messages=[
            {
                "role": "user",
                "content": f"Contexte documentaire :\n{contexte}\n\nQuestion : {question}",
            }
        ],
    )
    return "".join(b.text for b in resp.content if b.type == "text").strip()


def generate_answer(question: str, passages: list[dict]) -> str:
    """Génère la réponse (appel bloquant — à lancer dans un thread)."""
    if mode() == "claude":
        try:
            return _claude_answer(question, passages)
        except Exception as e:  # repli gracieux si l'appel échoue (réseau, quota…)
            return f"[Claude indisponible : {e}] " + _stub_answer(question, passages)
    return _stub_answer(question, passages)
