from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_current_user
from app.scrapers.doc_crawler import crawl_and_extract
from app.scrapers.text_processor import chunk_for_vectorization
from app.rag_engine.vector_db import store_migration_context
from pydantic import BaseModel

router = APIRouter()

class IngestRequest(BaseModel):
    url: str
    name: str

@router.post("/ingest")
async def ingest_docs(req: IngestRequest, user: dict = Depends(get_current_user)):
    """Dynamically crawl and ingest documentation."""
    try:
        content = await crawl_and_extract(req.url)
        if not content:
            raise HTTPException(status_code=400, detail="Failed to extract content from URL")
        
        chunks = chunk_for_vectorization(content)
        store_migration_context(chunks, req.url, req.name)
        return {"status": "success", "chunks": len(chunks)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
