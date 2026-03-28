"""
ChromaDB persistence initialization and core database utilities.
Delegates actual vector operations to the rag_engine for optimized AI performance.
"""

from app.rag_engine.vector_db import get_collection, init_local_chroma

def get_db_health():
    """Checks if the underlying vector persist directory is accessible."""
    try:
        col = get_collection()
        return {"status": "connected", "count": col.count()}
    except Exception as e:
        return {"status": "error", "message": str(e)}

__all__ = ["get_collection", "init_local_chroma", "get_db_health"]
