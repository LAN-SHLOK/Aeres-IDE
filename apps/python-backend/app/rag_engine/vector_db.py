import hashlib
import os
from typing import Any, Optional

import chromadb

from app.core.config import settings
from app.rag_engine.embedder import generate_embeddings

_client: Optional[Any] = None
_collection = None


def init_local_chroma():
    global _client, _collection
    try:
        path = settings.CHROMA_DB_PATH
        os.makedirs(path, exist_ok=True)
        _client = chromadb.PersistentClient(path=path)
        _collection = _client.get_or_create_collection("migration_docs")
        return _collection
    except Exception as e:
        print(f"[Chroma] Failed to initialize: {e}")
        # Create a mock collection to prevent crashing
        class MockCollection:
            def query(self, **kwargs): return {"documents": [[]], "metadatas": [[]]}
            def upsert(self, **kwargs): pass
            def get_or_create_collection(self, name): return self
        _collection = MockCollection()
        return _collection


def get_collection():
    global _collection
    if _collection is None:
        init_local_chroma()
    return _collection


def _chunk_id(function_name: str, index: int, chunk: str) -> str:
    h = hashlib.sha256(chunk.encode("utf-8", errors="replace")).hexdigest()[:16]
    return f"{function_name}_{index}_{h}"


def store_migration_context(chunks: list, source_url: str, function_name: str):
    col = get_collection()
    embeddings = generate_embeddings(chunks)
    ids = [_chunk_id(function_name, i, c) for i, c in enumerate(chunks)]
    col.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=chunks,
        metadatas=[{"source_url": source_url, "function": function_name} for _ in chunks],
    )


def query_relevant_fix(flagged_function: str, n_results: int = 5) -> list:
    try:
        col = get_collection()
        embedding = generate_embeddings([flagged_function])[0]
        results = col.query(query_embeddings=[embedding], n_results=n_results)
        docs = results.get("documents") or [[]]
        metas = results.get("metadatas") or [[]]
        row_docs = docs[0] if docs else []
        row_metas = metas[0] if metas else []
        out = []
        for d, m in zip(row_docs, row_metas):
            meta = m or {}
            out.append(
                {
                    "document": d,
                    "source_url": meta.get("source_url", ""),
                    "function": meta.get("function", ""),
                }
            )
        return out
    except Exception as e:
        print(f"[VectorDB] Query error: {e}")
        return []
