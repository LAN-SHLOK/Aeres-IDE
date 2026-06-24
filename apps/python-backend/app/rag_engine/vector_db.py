import hashlib
import os
from typing import Any, Optional

from app.core.config import settings
from app.rag_engine.embedder import generate_embeddings

_client: Optional[Any] = None
_catalyst_collection = None


def init_local_chroma():
    global _client, _collection, _catalyst_collection
    try:
        import chromadb
        path = settings.CHROMA_DB_PATH
        os.makedirs(path, exist_ok=True)
        _client = chromadb.PersistentClient(path=path)
        _collection = _client.get_or_create_collection("migration_docs")
        _catalyst_collection = _client.get_or_create_collection("catalyst_nodes")
        return _collection
    except Exception as e:
        print(f"[Chroma] Failed to initialize: {e}")
        raise RuntimeError(f"Chroma DB failed to initialize: {e}")


def get_collection():
    global _collection
    if _collection is None:
        init_local_chroma()
    return _collection


def get_catalyst_collection():
    global _catalyst_collection
    if _catalyst_collection is None:
        init_local_chroma()
    return _catalyst_collection



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

def get_package_migration_docs(package_name: str) -> list:
    """Retrieve all migration docs for a specific package from ChromaDB metadata."""
    try:
        col = get_collection()
        results = col.get(where={"function": package_name})
        
        docs = results.get("documents") or []
        metas = results.get("metadatas") or []
        
        out = []
        for d, m in zip(docs, metas):
            meta = m or {}
            out.append(
                {
                    "document": d,
                    "source_url": meta.get("source_url", ""),
                    "package": meta.get("function", ""),
                }
            )
        return out
    except Exception as e:
        print(f"[VectorDB] get_package_migration_docs error: {e}")
        return []

def store_catalyst_nodes(nodes: list, repo_name: str):
    col = get_catalyst_collection()
    if not nodes:
        return
    # Prepare text for embedding (combine name and docstring)
    texts_to_embed = [f"{n['type']} {n['name']}\n{n.get('docstring', '')}" for n in nodes]
    embeddings = generate_embeddings(texts_to_embed)
    ids = [f"{repo_name}_{n['file_path']}_{n['type']}_{n['name']}_{i}" for i, n in enumerate(nodes)]
    
    metadatas = []
    for n in nodes:
        metadatas.append({
            "repo": repo_name,
            "file_path": n["file_path"],
            "type": n["type"],
            "name": n["name"],
            "code_snippet": n.get("code", "")[:2000] # truncate code to save space
        })
        
    col.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=texts_to_embed,
        metadatas=metadatas,
    )

def query_catalyst_nodes(query: str, repo_name: str, n_results: int = 5) -> list:
    try:
        col = get_catalyst_collection()
        embedding = generate_embeddings([query])[0]
        results = col.query(
            query_embeddings=[embedding],
            n_results=n_results,
            where={"repo": repo_name}
        )
        docs = results.get("documents") or [[]]
        metas = results.get("metadatas") or [[]]
        row_docs = docs[0] if docs else []
        row_metas = metas[0] if metas else []
        out = []
        for d, m in zip(row_docs, row_metas):
            meta = m or {}
            out.append({
                "document": d,
                "repo": meta.get("repo", ""),
                "file_path": meta.get("file_path", ""),
                "type": meta.get("type", ""),
                "name": meta.get("name", ""),
                "code_snippet": meta.get("code_snippet", "")
            })
        return out
    except Exception as e:
        print(f"[VectorDB] query_catalyst_nodes error: {e}")
        return []
