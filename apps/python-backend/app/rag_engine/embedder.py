from __future__ import annotations
import os

from app.core.config import settings

_model = None

def load_embedding_model() -> SentenceTransformer:
    global _model
    cache = os.environ.get("EMBEDDING_CACHE")
    if cache:
        os.makedirs(cache, exist_ok=True)
        os.environ.setdefault("HF_HOME", cache)
        os.environ.setdefault("SENTENCE_TRANSFORMERS_HOME", cache)
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(settings.EMBEDDING_MODEL)
    return _model


def generate_embeddings(texts: list) -> list:
    model = load_embedding_model()
    vectors = model.encode(texts, convert_to_tensor=False)
    return vectors.tolist()
