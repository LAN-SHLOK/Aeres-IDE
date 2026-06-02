import os
import json
import logging
import asyncio
from typing import List, Dict, Any
from app.rag_engine.groq_gateway import groq_complete
from app.core.config import settings

logger = logging.getLogger(__name__)

async def scan_workspace_health(root_path: str, api_key: str = None) -> Dict[str, Any]:
    """
    Scans the workspace for security vulnerabilities, code smells, and performance issues.
    Returns a structured dict with health_score and issues.
    """
    if not os.path.isdir(root_path):
        return {"health_score": 100, "issues": [{"severity": "info", "message": "Invalid workspace path", "file": root_path, "suggested_fix": ""}]}

    # 1. Collect key files to scan (up to 5 to avoid massive context)
    target_files = []
    skip_dirs = {".git", "node_modules", "venv", ".venv", "__pycache__", "dist", "build", ".next"}
    valid_exts = {".py", ".js", ".jsx", ".ts", ".tsx", ".go", ".rs", ".php", ".html"}

    for root, dirs, files in os.walk(root_path):
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        for f in files:
            if any(f.endswith(ext) for ext in valid_exts):
                target_files.append(os.path.join(root, f))
                if len(target_files) >= 5:
                    break
        if len(target_files) >= 5:
            break

    if not target_files:
        return {"health_score": 100, "issues": [{"severity": "info", "message": "No source files found to scan", "file": root_path, "suggested_fix": ""}]}

    # 2. Read contents
    combined_context = ""
    for fp in target_files:
        try:
            with open(fp, "r", encoding="utf-8", errors="ignore") as fh:
                content = fh.read()
                # truncate massive files
                if len(content) > 5000:
                    content = content[:5000] + "\n...[truncated]"
                rel_path = os.path.relpath(fp, root_path)
                combined_context += f"--- FILE: {rel_path} ---\n{content}\n\n"
        except Exception as e:
            logger.warning(f"Could not read {fp}: {e}")

    # 3. Prompt Groq
    system_prompt = (
        "You are Aeres IDE's elite Code Health & Security Scanner. "
        "Analyze the provided source code files for: "
        "1. Security vulnerabilities (e.g. hardcoded secrets, injection flaws, XSS). "
        "2. Code smells (e.g. duplicated code, huge functions, poor naming). "
        "3. Performance bottlenecks. "
        "You MUST return ONLY a valid JSON object matching this schema exactly:\n"
        "{\n"
        '  "health_score": <int 0-100>,\n'
        '  "issues": [\n'
        '    {\n'
        '      "severity": "<critical|warning|info>",\n'
        '      "message": "<description of the issue>",\n'
        '      "file": "<relative file path>",\n'
        '      "suggested_fix": "<1-2 sentence description of how to fix it>"\n'
        '    }\n'
        "  ]\n"
        "}\n"
        "Do not include any markdown fences or extra text, just the JSON."
    )

    user_prompt = f"Scan the following codebase files and generate the JSON health report:\n\n{combined_context}"

    try:
        raw_resp = await asyncio.wait_for(
            groq_complete(
                system=system_prompt,
                user=user_prompt,
                max_tokens=2048,
                temperature=0.1,
                model=settings.GROQ_MODEL,
                api_key=api_key
            ),
            timeout=45.0
        )
        
        cleaned = raw_resp.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
            
        result = json.loads(cleaned.strip())
        
        # Ensure schema
        if "health_score" not in result or "issues" not in result:
            raise ValueError("Invalid schema")
            
        return result
    except Exception as e:
        logger.error(f"[HealthAgent] Failed to analyze workspace: {e}")
        # Fallback
        return {
            "health_score": 85,
            "issues": [
                {
                    "severity": "warning",
                    "message": f"Health scanner encountered an AI processing error: {str(e)}",
                    "file": "System",
                    "suggested_fix": "Check backend logs or Groq API key."
                }
            ]
        }
