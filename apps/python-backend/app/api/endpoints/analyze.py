"""Analyze endpoints — modernize and scan project files."""

from __future__ import annotations

import os

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.agents.anomaly_detector import detect_language, traverse_and_flag
from app.agents.orchestrator import run_modernize_pipeline
from app.core.models import ModernizeRequest, ProjectScanRequest
from app.core.security import get_current_user

router = APIRouter()


@router.post("/modernize")
async def modernize(req: ModernizeRequest, user: dict = Depends(get_current_user)):
    """Stream modernization results as Server-Sent Events."""

    async def event_stream():
        async for line in run_modernize_pipeline(req.content, req.path):
            yield f"data: {line}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/scan-project")
async def scan_project(req: ProjectScanRequest, user: dict = Depends(get_current_user)):
    """Scan multiple files for deprecated patterns."""
    issues = []
    for file_path in req.file_paths:
        try:
            if not os.path.isfile(file_path):
                continue
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
            language = detect_language(file_path)
            flags = traverse_and_flag(content, language)
            if flags:
                issues.append({
                    "file": file_path,
                    "language": language,
                    "flags": [fl.model_dump() for fl in flags],
                })
        except Exception:
            continue

    return {"total": sum(len(i["flags"]) for i in issues), "issues": issues}
