"""RAG query + Agent streaming endpoints."""

from __future__ import annotations

import os
import json
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from app.core.models import RagQueryRequest, AgentStreamRequest
from app.core.security import get_current_user
from app.rag_engine.groq_gateway import groq_complete
from app.agents.codebase_agent import CodebaseAgent
from app.agents.agent_loop import run_agent_loop

router = APIRouter()

class AgentEditRequest(BaseModel):
    instruction: str
    file_path: str
    file_content: str
    root_path: Optional[str] = ""

@router.post("/query")
async def rag_query(req: RagQueryRequest, request: Request, user: dict = Depends(get_current_user)):
    """Answer a question using CodebaseAgent (RAG + Context)."""
    api_key = request.headers.get("x-groq-api-key")
    root = req.root_path or os.path.abspath(os.path.join(os.getcwd(), "..", ".."))
    agent = CodebaseAgent(root_path=root, api_key=api_key)
    answer = await agent.answer_question(req.question, req.context)
    return {"answer": answer, "source_url": "", "confidence": 0.9}

@router.post("/agent-edit")
async def agent_edit(req: AgentEditRequest, request: Request, user: dict = Depends(get_current_user)):
    """Agentic edit: AI modifies a file based on instruction and returns the new content."""
    api_key = request.headers.get("x-groq-api-key")
    root = req.root_path or os.path.abspath(os.path.join(os.getcwd(), "..", ".."))
    agent = CodebaseAgent(root_path=root, api_key=api_key)
    result = await agent.agent_edit(req.instruction, req.file_path, req.file_content)
    return result

@router.post("/agent-stream")
async def agent_stream(req: AgentStreamRequest, request: Request, user: dict = Depends(get_current_user)):
    """
    Agentic coding assistant — streams step-by-step events via SSE.
    """
    api_key = request.headers.get("x-groq-api-key")
    root = req.root_path or os.path.abspath(os.path.join(os.getcwd(), "..", ".."))
    
    async def event_generator():
        try:
            async for step in run_agent_loop(
                instruction=req.instruction,
                context=req.context,
                file_path=req.file_path,
                root_path=root,
                conversation=req.conversation,
                images=req.images or [],
                max_iterations=10,
                api_key=api_key,
            ):
                yield f"data: {json.dumps(step)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
        finally:
            yield "data: [DONE]\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


class ConfirmEditRequest(BaseModel):
    id: str
    action: str  # "approve" or "reject"
    result: Optional[str] = ""

@router.post("/confirm-edit")
async def confirm_edit(req: ConfirmEditRequest):
    import tempfile
    import os
    import json
    path = os.path.join(tempfile.gettempdir(), f"aeres_edit_{req.id}.json")
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            data["status"] = "approved" if req.action == "approve" else "rejected"
            data["result"] = req.result
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f)
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}
    return {"success": False, "error": "No pending edit found with this ID"}


class AutocompleteRequest(BaseModel):
    prefix: str
    suffix: str
    language: Optional[str] = "javascript"
    file_path: Optional[str] = ""

@router.post("/autocomplete")
async def autocomplete(req: AutocompleteRequest, user: dict = Depends(get_current_user)):
    """Generate ultra-high-speed inline code suggestions using fast chat model."""
    from app.core.config import settings

    system_prompt = (
        "You are an expert AI software developer acting as a backend for an inline code completion engine (like GitHub Copilot).\n"
        "Your task is to provide the missing code that perfectly connects the PREFIX and SUFFIX.\n\n"
        "CRITICAL RULES:\n"
        "1. Output ONLY the exact raw code to insert. NO markdown blocks (e.g. no ```python or ```).\n"
        "2. NO conversational text, NO greetings, NO explanations. Just code.\n"
        "3. Match the exact indentation and style of the surrounding code.\n"
        "4. If the code is already complete, or you are unsure, return an empty response.\n"
        "5. Complete the current line, statement, or logical block. Do not rewrite the suffix."
    )

    prompt = f"<|fim_prefix|>{req.prefix}<|fim_hole|>{req.suffix}<|fim_suffix|>"
    
    try:
        completion = await groq_complete(
            system=system_prompt,
            user=prompt,
            max_tokens=120,
            model=settings.GROQ_CHAT_MODEL
        )
        suggestion = completion.strip()
        
        # Clean any markdown fences that the LLM may have hallucinated
        if suggestion.startswith("```"):
            lines = suggestion.split("\n")
            if len(lines) > 2:
                # Only remove last line if it's actually the closing markdown fence
                if lines[-1].strip().endswith("```"):
                    suggestion = "\n".join(lines[1:-1])
                else:
                    suggestion = "\n".join(lines[1:])
            else:
                suggestion = suggestion.replace("```", "")
        elif suggestion.endswith("```"):
            suggestion = suggestion[:-3].strip()
            
        return {"suggestion": suggestion}
    except Exception as e:
        print(f"[Autocomplete ERROR] {e}")
        return {"suggestion": ""}

