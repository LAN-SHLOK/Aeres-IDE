from __future__ import annotations
import os
from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.core.security import get_current_user
from app.agents.codebase_agent import CodebaseAgent

router = APIRouter()

@router.get("/")
async def search_project(q: str, root_path: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Search for code snippets in the project."""
    root = root_path or os.path.abspath(os.path.join(os.getcwd(), "..", ".."))
    agent = CodebaseAgent(root_path=root)
    results = agent.search_code(q)
    return {"results": results, "total": len(results)}
