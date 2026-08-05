import os
import json
import logging
import asyncio
import re
import fnmatch
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
    valid_exts = {".py", ".js", ".jsx", ".ts", ".tsx", ".go", ".rs", ".php", ".html", ".env", ".env.local", ".env.example"}
    
    # Parse gitignore to see if env files are ignored
    ignored_patterns = []
    gitignore_path = os.path.join(root_path, ".gitignore")
    if os.path.isfile(gitignore_path):
        try:
            with open(gitignore_path, "r", encoding="utf-8", errors="ignore") as gf:
                ignored_patterns = [line.strip() for line in gf.readlines() if line.strip() and not line.startswith("#")]
        except Exception as e:
            logger.warning(f"Could not read .gitignore: {e}")

    def is_gitignored(filepath: str) -> bool:
        filename = os.path.basename(filepath)
        rel_path = os.path.relpath(filepath, root_path).replace('\\', '/')
        
        for pat in ignored_patterns:
            pat = pat.replace('\\', '/')
            if pat.endswith('/'):
                if rel_path.startswith(pat) or f"/{pat}" in f"/{rel_path}": return True
            if fnmatch.fnmatch(filename, pat) or fnmatch.fnmatch(rel_path, pat) or fnmatch.fnmatch(rel_path, f"*/{pat}"):
                return True
            if f"/{pat}/" in f"/{rel_path}/":
                return True
        return False

    env_files_info = []

    for root, dirs, files in os.walk(root_path):
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        for f in files:
            if any(f.endswith(ext) for ext in valid_exts):
                fp = os.path.join(root, f)
                is_ignored = is_gitignored(fp)
                
                if ".env" in f:
                    if "example" in f.lower() or "template" in f.lower():
                        continue
                    env_files_info.append(f"{f} (Gitignored: {is_ignored})")
                    if is_ignored:
                        continue
                
                target_files.append(fp)
                if len(target_files) >= 25:
                    break
        if len(target_files) >= 25:
            break

    if not target_files:
        return {"health_score": 100, "issues": [{"severity": "info", "message": "No source files found to scan", "file": root_path, "suggested_fix": ""}]}

    # 2. Read contents
    combined_context = ""
    total_chars = 0
    MAX_CHARS = 12000
    
    for fp in target_files:
        if total_chars >= MAX_CHARS:
            break
        try:
            with open(fp, "r", encoding="utf-8", errors="ignore") as fh:
                content = fh.read()
                
                # If adding this file exceeds our global budget, truncate it to fit
                chars_left = MAX_CHARS - total_chars
                if len(content) > chars_left:
                    content = content[:chars_left] + "\n...[truncated]"
                
                rel_path = os.path.relpath(fp, root_path)
                added_text = f"--- FILE: {rel_path} ---\n{content}\n\n"
                combined_context += added_text
                total_chars += len(added_text)
        except Exception as e:
            logger.warning(f"Could not read {fp}: {e}")

    # 3. Prompt Groq
    system_prompt = (
        "You are Aeres IDE's elite Code Health & Security Scanner. "
        "Analyze the provided source code files for: "
        "1. Security vulnerabilities (e.g. hardcoded secrets, injection flaws, XSS). "
        "2. Code smells (e.g. duplicated code, huge functions, poor naming). "
        "3. Performance bottlenecks. "
        "IMPORTANT RULES FOR .ENV FILES: "
        "If a file is .env or .env.local, and is NOT Gitignored, you MUST flag it as a critical security vulnerability. "
        "EXCEPTION: Files named '.env.example' or '.env.template' are meant to be committed, DO NOT flag them. "
        "CRITICAL: If a normal code file (like server.js or index.js) merely imports 'dotenv' or loads env vars, DO NOT flag it as a vulnerability. Assume the .env file is safely Gitignored. "
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

    env_status = f"\nEnvironment Files Status:\n{chr(10).join(env_files_info)}\n" if env_files_info else ""
    user_prompt = f"Scan the following codebase files and generate the JSON health report:{env_status}\n\n{combined_context}"

    try:
        raw_resp = await asyncio.wait_for(
            groq_complete(
                system=system_prompt,
                user=user_prompt,
                max_tokens=2000,
                temperature=0.1,
                model=settings.GROQ_FAST_MODEL,
                api_key=api_key
            ),
            timeout=45.0
        )
        
        cleaned = raw_resp.strip()
        
        # Use regex to extract JSON object from potentially conversational response
        json_match = re.search(r'\{.*\}', cleaned, re.DOTALL)
        if json_match:
            cleaned = json_match.group(0)
            
        result = json.loads(cleaned)
        
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
