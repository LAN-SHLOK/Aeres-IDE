"""Anomaly detector — scans source files for deprecated API usage."""

from __future__ import annotations

import json
import os
from typing import Dict, List

from app.core.models import DeprecationFlag, Severity

_DB_PATH = os.path.join(os.path.dirname(__file__), "deprecation_db.json")
_db_cache: Dict | None = None


def load_deprecation_db() -> Dict:
    global _db_cache
    if _db_cache is not None:
        return _db_cache
    with open(_DB_PATH, "r", encoding="utf-8") as f:
        _db_cache = json.load(f)
    return _db_cache


def detect_language(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    mapping = {
        ".js": "javascript",
        ".jsx": "javascript",
        ".ts": "typescript",
        ".tsx": "typescript",
        ".py": "python",
    }
    return mapping.get(ext, "unknown")


def extract_context_block(content: str, line: int, window: int = 10) -> str:
    lines = content.splitlines()
    start = max(0, line - window)
    end = min(len(lines), line + window + 1)
    return "\n".join(lines[start:end])


def traverse_and_flag(content: str, language: str) -> List[DeprecationFlag]:
    db = load_deprecation_db()
    lang_key = language
    if lang_key == "typescript":
        lang_key = "javascript"
    patterns = db.get(lang_key, {})
    if not patterns:
        return []

    flags: List[DeprecationFlag] = []
    lines = content.splitlines()

    for pattern, info in patterns.items():
        for idx, line_text in enumerate(lines):
            if pattern in line_text:
                line_number = idx + 1
                snippet = extract_context_block(content, idx, window=5)
                flags.append(
                    DeprecationFlag(
                        line_number=line_number,
                        function_name=pattern,
                        replacement=info.get("replacement", ""),
                        docs_query=info.get("docs_query", ""),
                        code_snippet=snippet,
                        severity=Severity(info.get("severity", "medium")),
                        since_version=info.get("since_version", ""),
                    )
                )
    return flags
