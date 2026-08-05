from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_current_user
from app.core.models import CausalChainRequest
from app.agents.causal_tracer import build_causal_chain
from app.rag_engine.groq_gateway import groq_complete
from pydantic import BaseModel
import os

router = APIRouter()

@router.post("/causal-chain")
async def get_causal_chain(body: CausalChainRequest, user: dict = Depends(get_current_user)):
    """Build and return causal blame chain for a function."""
    if not os.path.exists(body.repo_path):
        raise HTTPException(status_code=400, detail="Invalid repo_path")
        
    result = build_causal_chain(
        repo_path=body.repo_path,
        file_path=body.file_path,
        function_name=body.function_name,
        error_message=body.error_message,
    )
    return result

@router.get("/status")
async def get_status():
    return {"status": "active", "feature": "causal_blame_map"}

class CommitGenerateRequest(BaseModel):
    diff: str

@router.post("/generate-commit")
async def generate_commit(body: CommitGenerateRequest, user: dict = Depends(get_current_user)):
    """Generate a commit message using the backend LLM based on git diff."""
    system = "You are an expert developer. Read the provided git diff and write a concise, conventional commit message. Return ONLY the commit message itself, nothing else."
    user_prompt = f"Diff:\n{body.diff[:4000]}"
    try:
        msg = await groq_complete(system, user_prompt, max_tokens=100, temperature=0.3, intelligence_level="fast")
        return {"message": msg.strip()}
    except Exception as e:
        return {"message": "Update code"}
