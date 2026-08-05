"""Analyze endpoints — modernize and scan project files."""

from __future__ import annotations

import os

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from app.agents.anomaly_detector import detect_language, traverse_and_flag
from app.agents.orchestrator import run_modernize_pipeline
from app.agents.health_agent import scan_workspace_health
from app.core.models import ModernizeRequest, ProjectScanRequest, HealthScanRequest
from app.core.security import get_current_user

router = APIRouter()

@router.post("/modernize")
async def modernize(req: ModernizeRequest, request: Request, user: dict = Depends(get_current_user)):
    """Stream modernization results as Server-Sent Events."""
    api_key = request.headers.get("x-groq-api-key")

    async def event_stream():
        async for line in run_modernize_pipeline(req.content, req.path, dep_name=req.dep_name, api_key=api_key):
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


@router.post("/health")
async def scan_health(req: HealthScanRequest, request: Request, user: dict = Depends(get_current_user)):
    """Run an AI health and security scan on the workspace."""
    api_key = request.headers.get("x-groq-api-key")
    result = await scan_workspace_health(req.root_path, api_key=api_key)
    return result

import re

@router.get("/call_graph")
async def get_call_graph(file_path: str, root_path: str):
    """Extract all functions, outbound calls, and inbound calls."""
    if not os.path.exists(file_path):
        return {"functions": []}
    
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
        lines = content.split("\n")
        
    functions = []
    # Regex to catch function definitions across multiple languages loosely
    # matches: def foo(, function foo(, func foo(, class Foo(
    func_pattern = re.compile(r"^(?:export\s+|async\s+|public\s+|private\s+)?(?:def|function|func|class)\s+([a-zA-Z0-9_]+)\s*[\(\:]", re.MULTILINE)
    
    # Also match arrow functions: const foo = () =>
    arrow_pattern = re.compile(r"^(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?(?:\([^\)]*\)|[a-zA-Z0-9_]+)\s*=>", re.MULTILINE)
    
    matches = []
    for m in func_pattern.finditer(content):
        matches.append((m.group(1), m.start()))
    for m in arrow_pattern.finditer(content):
        matches.append((m.group(1), m.start()))
        
    matches.sort(key=lambda x: x[1])
    
    for i, (name, start_idx) in enumerate(matches):
        line_num = content[:start_idx].count('\n') + 1
        
        # Determine function body bounds (rough estimate: up to next function or end of file)
        end_idx = matches[i+1][1] if i + 1 < len(matches) else len(content)
        body = content[start_idx:end_idx]
        
        # Outbound calls: match words followed by (
        call_pattern = re.compile(r"([a-zA-Z0-9_]+)\s*\(")
        calls = call_pattern.findall(body)
        
        # Filter out common keywords
        keywords = {"if", "for", "while", "switch", "catch", "function", "def", "class", name}
        outbound = [c for c in set(calls) if c not in keywords]
        
        functions.append({
            "name": name,
            "line": line_num,
            "outbound_calls": outbound,
            "outbound_count": len(outbound),
            "inbound_count": 0,
            "inbound_locations": []
        })

    # Find Inbound Calls (Fast cross-file grep in root_path for the function names)
    if not root_path or not os.path.isdir(root_path):
        return {"functions": functions}

    func_names = {f["name"] for f in functions}
    if not func_names:
        return {"functions": functions}

    # Fast scan skipping node_modules, .git, etc.
    skip_dirs = {".git", "node_modules", "dist", "build", ".next", ".aeres"}
    
    inbound_map = {n: [] for n in func_names}
    
    for root, dirs, files in os.walk(root_path):
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        for file in files:
            ext = os.path.splitext(file)[1]
            if ext not in [".js", ".jsx", ".ts", ".tsx", ".py", ".go", ".rs", ".java", ".c", ".cpp"]:
                continue
            
            f_path = os.path.join(root, file)
            # skip self for inbound unless we want self-recursion
            if f_path == file_path:
                continue
                
            try:
                with open(f_path, "r", encoding="utf-8", errors="ignore") as f:
                    f_content = f.read()
                    
                for name in func_names:
                    # Look for name(
                    if re.search(r"\b" + name + r"\s*\(", f_content):
                        # Get lines
                        lines = f_content.split("\n")
                        for l_idx, l in enumerate(lines):
                            if re.search(r"\b" + name + r"\s*\(", l):
                                inbound_map[name].append({
                                    "file": f_path,
                                    "line": l_idx + 1
                                })
            except Exception:
                pass
                
    for f in functions:
        f["inbound_locations"] = inbound_map[f["name"]]
        f["inbound_count"] = len(inbound_map[f["name"]])
        
    return {"functions": functions}

