"""Anomaly detector — scans source files for deprecated API usage."""

from __future__ import annotations

import json
import os
from typing import Dict, List

from app.core.models import DeprecationFlag, Severity

_DB_PATH = os.path.join(os.path.dirname(__file__), "deprecation_db.json")
_db_cache: Dict | None = None
_db_mtime: float = 0.0


def load_deprecation_db() -> Dict:
    global _db_cache, _db_mtime
    try:
        current_mtime = os.path.getmtime(_DB_PATH)
    except OSError:
        current_mtime = 0.0
    if _db_cache is not None and current_mtime == _db_mtime:
        return _db_cache
    with open(_DB_PATH, "r", encoding="utf-8") as f:
        _db_cache = json.load(f)
    _db_mtime = current_mtime
    return _db_cache


def detect_language(file_path: str) -> str:
    """Map file extension to language identifier matching the frontend langDetect.js."""
    ext = os.path.splitext(file_path)[1].lower()
    mapping = {
        # Web
        ".js": "javascript", ".jsx": "javascript", ".mjs": "javascript", ".cjs": "javascript",
        ".ts": "typescript", ".tsx": "typescript", ".mts": "typescript",
        ".css": "css", ".scss": "scss", ".sass": "scss", ".less": "css",
        ".html": "html", ".htm": "html", ".vue": "html", ".svelte": "html",
        ".json": "json", ".jsonc": "json",
        # Systems
        ".py": "python", ".pyw": "python", ".pyi": "python",
        ".go": "go",
        ".rs": "rust",
        ".c": "c", ".h": "c",
        ".cpp": "cpp", ".cc": "cpp", ".cxx": "cpp", ".hpp": "cpp", ".hxx": "cpp",
        ".java": "java",
        ".kt": "kotlin", ".kts": "kotlin",
        ".swift": "swift",
        ".dart": "dart",
        ".cs": "csharp",
        # Scripting
        ".rb": "ruby",
        ".php": "php",
        ".lua": "lua",
        ".r": "r", ".R": "r",
        ".pl": "perl", ".pm": "perl",
        ".sh": "shell", ".bash": "shell", ".zsh": "shell", ".fish": "shell",
        ".ps1": "powershell", ".psm1": "powershell",
        # Data / Config
        ".sql": "sql",
        ".graphql": "graphql", ".gql": "graphql",
        ".md": "markdown", ".mdx": "markdown",
        ".yml": "yaml", ".yaml": "yaml",
        ".toml": "toml",
        ".xml": "xml", ".svg": "xml",
        ".proto": "protobuf",
        ".tf": "hcl", ".hcl": "hcl",
        # Modern / Niche
        ".zig": "zig",
        ".nim": "nim",
        ".ex": "elixir", ".exs": "elixir",
        ".erl": "erlang",
        ".hs": "haskell",
        ".ml": "fsharp", ".fs": "fsharp", ".fsx": "fsharp",
        ".clj": "clojure", ".cljs": "clojure",
        ".scala": "scala",
        ".v": "verilog", ".vhd": "vhdl",
        ".asm": "asm", ".s": "asm",
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
        excludes = info.get("exclude", [])
        require_context = info.get("require_context", False)
        context_patterns = info.get("context_patterns", [])

        for idx, line_text in enumerate(lines):
            if pattern in line_text:
                # Check exclusions — skip if any exclude pattern is in this line
                excluded = False
                for exc in excludes:
                    if exc in line_text:
                        excluded = True
                        break
                if excluded:
                    continue

                # If require_context is set, at least one context_pattern must also
                # appear somewhere in the file (or on nearby lines) for it to count
                if require_context and context_patterns:
                    # Search a window of ±10 lines for context patterns
                    window_start = max(0, idx - 10)
                    window_end = min(len(lines), idx + 11)
                    context_block = "\n".join(lines[window_start:window_end])
                    context_found = any(cp in context_block for cp in context_patterns)
                    if not context_found:
                        continue

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

