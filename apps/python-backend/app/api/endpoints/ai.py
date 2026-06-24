"""AI endpoints — completion, explain, generate."""

from __future__ import annotations
import os
import json
from fastapi import APIRouter, Depends, HTTPException

from app.core.models import CompletionRequest, ExplainRequest, GenerateRequest, RagQueryRequest
from app.core.security import get_current_user
from app.rag_engine.groq_gateway import groq_complete
from app.agents.codebase_agent import CodebaseAgent
from pydantic import BaseModel

class ApiPayloadRequest(BaseModel):
    method: str
    url: str
from app.rag_engine.groq_gateway import groq_complete
from app.agents.codebase_agent import CodebaseAgent

router = APIRouter()

@router.post("/chat")
async def codebase_chat(req: RagQueryRequest, user: dict = Depends(get_current_user)):
    """General chat about the codebase."""
    try:
        root = req.root_path if hasattr(req, 'root_path') and req.root_path else os.getcwd()
        agent = CodebaseAgent(root_path=root)
        answer = await agent.answer_question(req.question, file_context=req.context)
        return {"answer": answer}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI Agent Error: {str(e)}")

@router.post("/complete")
async def inline_complete(req: CompletionRequest, user: dict = Depends(get_current_user)):
    """Inline code completion."""
    system = (
        f"You are a {req.language} code completion engine. Output ONLY the code that "
        "continues from the prefix. No explanations, no markdown fences."
    )
    user_prompt = f"File: {req.file_path}\n\n// Code before cursor:\n{req.prefix[-1000:]}\n\n// Code after cursor:\n{req.suffix[:500]}\n\n// Complete the code at the cursor position:"

    completion = await groq_complete(
        system, user_prompt, max_tokens=150, temperature=0.1, stop=["\n\n", "```"]
    )
    return {"completion": completion.strip()}


@router.post("/explain")
async def explain_selection(req: ExplainRequest, user: dict = Depends(get_current_user)):
    """Explain a code selection in 2-3 sentences."""
    system = (
        "You are a code explanation engine. Explain the given code in 2-3 concise sentences. "
        "Focus on what the code does and why, not line-by-line description."
    )
    user_prompt = f"Language: {req.language}\n\nCode:\n{req.selection}"

    explanation = await groq_complete(system, user_prompt, max_tokens=300, temperature=0.3)
    return {"explanation": explanation.strip()}


@router.post("/generate")
async def generate_from_comment(req: GenerateRequest, user: dict = Depends(get_current_user)):
    """Generate code from a comment/description."""
    system = (
        f"You are a {req.language} code generation engine. Output ONLY raw code. "
        "No explanations, no markdown fences, no preamble."
    )
    user_prompt = f"Existing context:\n{req.context[-1000:]}\n\nGenerate code for:\n{req.comment}"

    code = await groq_complete(system, user_prompt, max_tokens=1000, temperature=0.2)
    return {"code": code.strip()}

@router.post("/generate-api-payload")
async def generate_api_payload(req: ApiPayloadRequest, user: dict = Depends(get_current_user)):
    """Generate a mock JSON payload for an API request."""
    system = (
        "You are an API assistant. The user will provide an HTTP method and URL. "
        "Generate a realistic JSON body payload for that request. "
        "Output ONLY valid JSON. No markdown formatting, no explanations."
    )
    user_prompt = f"Method: {req.method}\nURL: {req.url}\n\nGenerate JSON body:"

    payload = await groq_complete(system, user_prompt, max_tokens=500, temperature=0.3)
    payload = payload.strip().strip("`").removeprefix("json").strip()
    try:
        parsed_payload = json.loads(payload)
    except Exception:
        parsed_payload = payload
    return {"payload": parsed_payload}
