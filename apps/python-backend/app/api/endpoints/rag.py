"""RAG query + Agent streaming endpoints."""

from __future__ import annotations

import os
import json
from fastapi import APIRouter, Depends
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
async def rag_query(req: RagQueryRequest, user: dict = Depends(get_current_user)):
    """Answer a question using CodebaseAgent (RAG + Context)."""
    root = req.root_path or os.path.abspath(os.path.join(os.getcwd(), "..", ".."))
    agent = CodebaseAgent(root_path=root)
    answer = await agent.answer_question(req.question, req.context)
    return {"answer": answer, "source_url": "", "confidence": 0.9}

@router.post("/agent-edit")
async def agent_edit(req: AgentEditRequest, user: dict = Depends(get_current_user)):
    """Agentic edit: AI modifies a file based on instruction and returns the new content."""
    root = req.root_path or os.path.abspath(os.path.join(os.getcwd(), "..", ".."))
    agent = CodebaseAgent(root_path=root)
    result = await agent.agent_edit(req.instruction, req.file_path, req.file_content)
    return result

@router.post("/agent-stream")
async def agent_stream(req: AgentStreamRequest, user: dict = Depends(get_current_user)):
    """
    Agentic coding assistant — streams step-by-step events via SSE.
    
    Each event is a JSON object:
    - { type: "thinking", content: "..." }
    - { type: "tool_call", tool: "read_file", args: {...} }
    - { type: "tool_result", tool: "read_file", result: "..." }
    - { type: "needs_confirm", tool: "write_file", args: {...} }
    - { type: "message", content: "final answer" }
    - { type: "error", content: "..." }
    """
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
    from app.agents.agent_loop import PENDING_EDITS
    if req.id in PENDING_EDITS:
        PENDING_EDITS[req.id]["status"] = "approved" if req.action == "approve" else "rejected"
        PENDING_EDITS[req.id]["result"] = req.result
        return {"success": True}
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
        "You are an expert AI software developer. You act as an inline code autocomplete companion.\n"
        "Given the code prefix (code before the cursor) and suffix (code after the cursor), your job is to output "
        "ONLY the immediate code completion that should be inserted at the cursor position.\n\n"
        "Instructions:\n"
        "1. Output ONLY the raw completion code to insert. Do NOT wrap it in markdown code blocks, do NOT write markdown language tags, "
        "and do NOT include any introductory or explanatory conversational text. Output raw code ONLY.\n"
        "2. The completion should fit seamlessly between the prefix and the suffix. Keep indentation and style consistent.\n"
        "3. Be extremely brief. Suggest the next few lines or the completion of the current line/block (max 120 tokens).\n"
        "4. If no completion is appropriate or if the context is ambiguous, output an empty string.\n"
    )

    prompt = f"### Prefix:\n{req.prefix}\n\n### Suffix:\n{req.suffix}\n\nGenerate raw code completion to insert at the cursor position:"
    
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
                # Remove first and last lines
                suggestion = "\n".join(lines[1:-1])
            else:
                suggestion = suggestion.replace("```", "")
        if suggestion.endswith("```"):
            suggestion = suggestion[:-3].strip()
            
        return {"suggestion": suggestion}
    except Exception as e:
        print(f"[Autocomplete ERROR] {e}")
        return {"suggestion": ""}

