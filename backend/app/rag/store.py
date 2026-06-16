"""Index documentaire du RAG — ingestion + récupération.

Première itération volontairement légère : récupération **lexicale TF-IDF en pur
Python** (aucune dépendance externe), pour fonctionner sans clé API ni base
vectorielle. L'interface ``search(query, k)`` est pensée pour être remplacée plus
tard par des embeddings + une vector DB (Qdrant/pgvector) sans toucher au reste.
"""

from __future__ import annotations

import math
import re
import unicodedata
from collections import Counter
from pathlib import Path

KNOWLEDGE_DIR = Path(__file__).resolve().parents[2] / "data" / "knowledge"

# Index en mémoire (reconstruit par reindex()).
_chunks: list[dict] = []
_idf: dict[str, float] = {}
_chunk_vectors: list[dict[str, float]] = []


def _strip_accents(text: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn"
    )


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", _strip_accents(text.lower()))


def _parse_doc(path: Path) -> tuple[dict, str]:
    """Sépare l'en-tête de métadonnées (entre ``---``) du corps."""
    raw = path.read_text("utf-8")
    meta: dict = {"equipment": path.stem, "procedure": ""}
    body = raw
    if raw.startswith("---"):
        end = raw.find("---", 3)
        if end != -1:
            header = raw[3:end]
            body = raw[end + 3 :]
            for line in header.splitlines():
                if ":" in line:
                    k, v = line.split(":", 1)
                    meta[k.strip()] = v.strip()
    return meta, body.strip()


def _chunk_body(body: str) -> list[str]:
    """Découpe par paragraphes (séparés par une ligne vide), titres ignorés seuls."""
    parts = [p.strip() for p in re.split(r"\n\s*\n", body) if p.strip()]
    # Fusionne un titre Markdown isolé avec le paragraphe suivant.
    chunks: list[str] = []
    pending_heading = ""
    for p in parts:
        if p.startswith("#") and "\n" not in p:
            pending_heading = p.lstrip("# ").strip()
            continue
        chunks.append(f"{pending_heading}. {p}" if pending_heading else p)
        pending_heading = ""
    return chunks


def reindex() -> int:
    """(Re)charge la base documentaire et construit l'index TF-IDF. Renvoie le
    nombre de chunks indexés."""
    global _chunks, _idf, _chunk_vectors
    chunks: list[dict] = []
    if KNOWLEDGE_DIR.is_dir():
        for path in sorted(KNOWLEDGE_DIR.glob("*.md")):
            meta, body = _parse_doc(path)
            for i, text in enumerate(_chunk_body(body)):
                chunks.append(
                    {
                        "id": f"{path.stem}#{i}",
                        "text": text,
                        "equipment": meta.get("equipment", path.stem),
                        "procedure": meta.get("procedure", ""),
                        "tokens": _tokenize(text),
                    }
                )

    # IDF
    n = len(chunks)
    df: Counter[str] = Counter()
    for c in chunks:
        for term in set(c["tokens"]):
            df[term] += 1
    idf = {term: math.log((1 + n) / (1 + d)) + 1 for term, d in df.items()}

    # Vecteurs TF-IDF normalisés par chunk
    vectors: list[dict[str, float]] = []
    for c in chunks:
        vectors.append(_tfidf_vector(c["tokens"], idf))

    _chunks, _idf, _chunk_vectors = chunks, idf, vectors
    return n


def _tfidf_vector(tokens: list[str], idf: dict[str, float]) -> dict[str, float]:
    if not tokens:
        return {}
    tf = Counter(tokens)
    vec = {term: (count / len(tokens)) * idf.get(term, 0.0) for term, count in tf.items()}
    norm = math.sqrt(sum(w * w for w in vec.values()))
    if norm == 0:
        return {}
    return {term: w / norm for term, w in vec.items()}


def _cosine(a: dict[str, float], b: dict[str, float]) -> float:
    if not a or not b:
        return 0.0
    small, large = (a, b) if len(a) < len(b) else (b, a)
    return sum(w * large.get(term, 0.0) for term, w in small.items())


def search(query: str, k: int = 4) -> list[dict]:
    """Top-k chunks par similarité TF-IDF cosinus. Renvoie des dicts sans le
    champ interne ``tokens``, avec un ``score``."""
    qvec = _tfidf_vector(_tokenize(query), _idf)
    scored = [
        (_cosine(qvec, _chunk_vectors[i]), c) for i, c in enumerate(_chunks)
    ]
    scored.sort(key=lambda x: x[0], reverse=True)
    results = []
    for score, c in scored[:k]:
        if score <= 0:
            continue
        results.append(
            {
                "id": c["id"],
                "text": c["text"],
                "equipment": c["equipment"],
                "procedure": c["procedure"],
                "score": round(score, 4),
            }
        )
    return results


def chunk_count() -> int:
    return len(_chunks)
