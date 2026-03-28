"""RAG query endpoint."""

from __future__ import annotations

import os
from fastapi import APIRouter, Depends

from app.core.models import RagQueryRequest
from app.core.security import get_current_user
from app.rag_engine.groq_gateway import groq_complete
from app.agents.codebase_agent import CodebaseAgent

router = APIRouter()

@router.post("/query")
async def rag_query(req: RagQueryRequest, user: dict = Depends(get_current_user)):
    """Answer a question using CodebaseAgent (RAG + Context)."""
    root = req.root_path or os.path.abspath(os.path.join(os.getcwd(), "..", ".."))
    agent = CodebaseAgent(root_path=root)
    answer = await agent.answer_question(req.question, req.context)
    
    # Still return source_url if we want to show it in UI
    # For now, let's just return the answer
    return {"answer": answer, "source_url": "", "confidence": 0.9}
