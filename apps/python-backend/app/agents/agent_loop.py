"""
Aeres Agent Loop — The brain of the agentic coding assistant.

Implements a tool-use loop where the LLM decides which tools to call,
executes them, and feeds results back until a final answer is produced.
"""

import os
import json
import asyncio
import subprocess
import re
import urllib.request
from typing import AsyncGenerator, Dict, List, Optional
from app.rag_engine.groq_gateway import groq_tool_complete
from app.rag_engine.vector_db import query_relevant_fix

# ──────────────────────────────────────────
# Tool Definitions (Groq function-calling format)
# ──────────────────────────────────────────

AGENT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read the full content of a file from the workspace. Use this to understand existing code before making changes.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Absolute path to the file to read"
                    }
                },
                "required": ["file_path"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "write_file",
            "description": "Create a NEW file or OVERWRITE an existing file with the provided content. For existing files, the user will be asked to accept or reject. Use edit_file for surgical changes instead.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Absolute path to the file to write"
                    },
                    "content": {
                        "type": "string",
                        "description": "The complete file content to write"
                    },
                    "description": {
                        "type": "string",
                        "description": "Brief explanation of what this write does"
                    }
                },
                "required": ["file_path", "content", "description"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "edit_file",
            "description": "Make a surgical edit to an existing file by replacing specific text. The user will be shown a diff and asked to accept or reject.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Absolute path to the file to edit"
                    },
                    "find": {
                        "type": "string",
                        "description": "The exact text to find and replace (must match exactly)"
                    },
                    "replace": {
                        "type": "string",
                        "description": "The replacement text"
                    },
                    "description": {
                        "type": "string",
                        "description": "Brief explanation of what this edit does"
                    }
                },
                "required": ["file_path", "find", "replace", "description"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_code",
            "description": "Search the entire codebase for a text pattern. Returns matching file paths and line numbers.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The text pattern to search for"
                    },
                    "file_pattern": {
                        "type": "string",
                        "description": "Optional glob pattern to filter files (e.g., '*.py', '*.jsx')"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_directory",
            "description": "List all files and subdirectories in a directory. Use this to understand project structure.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Absolute path to the directory to list"
                    },
                    "recursive": {
                        "type": "boolean",
                        "description": "If true, list recursively (max 3 levels deep)"
                    }
                },
                "required": ["path"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "run_command",
            "description": "Execute a shell command silently and get the output. Good for quick checks like 'node -v', 'dir', etc.",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": { "type": "string", "description": "The shell command" },
                    "cwd": { "type": "string", "description": "Working directory (defaults to workspace root)" }
                },
                "required": ["command"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "run_in_terminal",
            "description": "Run a command in the IDE's visible integrated terminal. The user can see the output live. Use for: npm run dev, python app.py, pip install, npm install, long-running servers, etc.",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": { "type": "string", "description": "Command to run in the IDE terminal" }
                },
                "required": ["command"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "debug_file",
            "description": "Launch the IDE debugger on a file. Supports Python (debugpy) and Node.js (--inspect). The debug panel opens with output, variables, and call stack.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": { "type": "string", "description": "Absolute path to the file to debug" }
                },
                "required": ["file_path"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "ask_user",
            "description": "Ask the user a clarifying question when the instruction is ambiguous.",
            "parameters": {
                "type": "object",
                "properties": {
                    "question": { "type": "string", "description": "The question" }
                },
                "required": ["question"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_plan",
            "description": "Create an implementation plan as a markdown artifact in .aeres/plans/. Use this BEFORE starting complex multi-step tasks to outline your approach, design decisions, and ordered steps.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": { "type": "string", "description": "Short descriptive title for the plan (used as filename slug)" },
                    "content": { "type": "string", "description": "Full markdown content of the implementation plan" }
                },
                "required": ["title", "content"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_walkthrough",
            "description": "Create a walkthrough/summary markdown artifact in .aeres/walkthroughs/. Use this AFTER completing work to document what was changed, tested, and verified.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": { "type": "string", "description": "Short descriptive title for the walkthrough" },
                    "content": { "type": "string", "description": "Full markdown content summarizing the work done" }
                },
                "required": ["title", "content"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "save_context",
            "description": "Persist a knowledge note for future conversations in .aeres/context/. Save important project decisions, architecture notes, or user preferences so you can recall them in future sessions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "topic": { "type": "string", "description": "Topic identifier (used as filename, e.g. 'tech_stack', 'architecture')" },
                    "content": { "type": "string", "description": "The knowledge content to persist" }
                },
                "required": ["topic", "content"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "open_browser",
            "description": "Open a URL in the user's system browser for verification. Use after starting a dev server, deploying, or when you need the user to see a web page.",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": { "type": "string", "description": "The URL to open" },
                    "reason": { "type": "string", "description": "Brief reason for opening this URL" }
                },
                "required": ["url"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "multi_edit_file",
            "description": "Make multiple surgical find-and-replace edits to a file in a single pass. Use this for complex refactors or multi-line changes.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": { "type": "string", "description": "Absolute path to the file to edit" },
                    "description": { "type": "string", "description": "Brief explanation of what this edit does" },
                    "edits": {
                        "type": "array",
                        "description": "List of find/replace chunks",
                        "items": {
                            "type": "object",
                            "properties": {
                                "find": { "type": "string", "description": "The exact text to find and replace (must match exactly)" },
                                "replace": { "type": "string", "description": "The replacement text" }
                            },
                            "required": ["find", "replace"]
                        }
                    }
                },
                "required": ["file_path", "description", "edits"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "read_url",
            "description": "Fetch content from a web URL. The HTML will be stripped and returned as basic text. Use this to read documentation, API references, or external knowledge.",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": { "type": "string", "description": "The URL to fetch (must start with http:// or https://)" }
                },
                "required": ["url"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "semantic_search",
            "description": "Perform a semantic natural language query against the codebase vector database to find related files and snippets.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": { "type": "string", "description": "The search query (e.g., 'jwt validation logic')" }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_web",
            "description": "Search the web (DuckDuckGo) for documentation, tutorials, or error resolutions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": { "type": "string", "description": "The search term or error message" }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "find_symbol",
            "description": "Find the definition of a specific class, function, or symbol name in the codebase.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": { "type": "string", "description": "The class or function name to locate" }
                },
                "required": ["symbol"]
            }
        }
    },
]

# ──────────────────────────────────────────
# System Prompt
# ──────────────────────────────────────────

AGENT_SYSTEM_PROMPT = """You are Aeres (codename Aeres), the ultimate autonomous AI software engineer and elite product designer inside Aeres IDE. You possess senior-staff architectural intelligence, perfect self-correction pipelines, and a high-end designer's eye for premium aesthetics.

---

## ⚡ YOUR CORE SUPERPOWERS (MUST BE USED AUTONOMOUSLY)

### 1. 🛠️ The Self-Healing Auto-Correction Loop
If any tool command, test runner, compile script, or package install returns an ERROR:
- **DO NOT stop and complain to the user.** You are a fully autonomous developer!
- **Analyze the trace**: Read the stderr/stdout traceback, find the exact file and line number causing the crash.
- **Search for the fix**: Call `find_symbol` or `search_web` to research the exact error message or package deprecation.
- **Auto-Repair**: Use `multi_edit_file` or `write_file` to apply surgical fixes.
- **Verify**: Re-run the compile or test command. **Repeat this loop automatically** until the build compiles with `Exit code: 0`. Present only fully verified, working code to the user!

### 2. 🎨 Elite Visual Aesthetics & "Wow" Factor
When designing frontend components, user interfaces, or interactive dashboards:
- **Harmonious Color Systems**: Never use basic colors. Use HSL-curated sleek dark modes, vibrant gradients, neon glow borders, and premium glassmorphism.
- **Google Typography**: Load and utilize elegant fonts (like Outfit, Inter, or Outfit) to elevate scannability.
- **Bespoke SVGs**: Do not use generic emoji or empty text placeholders for icons. Craft premium custom, scalable inline SVGs with smooth strokes and gradients.
- **Interactive Micro-Animations**: Add hover transitions, pulse animations, and interactive scaling indicators to make interfaces feel alive and responsive.
- **Complete Logic**: Never output unfinished boilerplate, `// TODO` comments, or placeholders. Every component must be fully wired up.

### 3. 🔍 AST & Code Dependency Tracing
Before refactoring any class, function, or DB schema:
- Call `find_symbol` to locate the target definition.
- Use `search_code` to scan for all files importing or referencing the symbol.
- Update all occurrences in a single pass using `multi_edit_file` to prevent compiler breaks.

### 4. 🧠 Double-Check Reflection (Internal Critic)
Before you queue any edits for user confirmation, perform a mandatory internal review in your `<scratchpad>`:
- Check for mismatched braces, missing imports, unresolved variables, and lint warnings.
- Verify exact find-and-replace match text including leading whitespace.

### 5. 🚫 Zero-Hallucination Grounding (CRITICAL PRINCIPLES)
To guarantee high precision and completely eliminate hallucinations:
- **NEVER Edit/Write Without Reading**: You MUST call `read_file` to inspect the complete, current content of a file before calling `edit_file` or `write_file` on it. Never assume or guess file contents.
- **NEVER Guess File Paths**: If you are unsure of a file's location, use `search_code` or `list_directory` to find it first. Never target imaginary paths.
- **NO BOILERPLATE / PLACEHOLDERS**: When editing or writing files, you must output the 100% complete, fully implemented code. Never use `// TODO` or `...` placeholders that truncate code.
- **Verbatim Exact Matches**: The `find` block in `edit_file` must contain the exact, verbatim text including spaces, indentation, and newlines. Provide enough unique surrounding context lines to ensure the match is unique.
- **NEVER Output XML Tool Calls**: You must use the native JSON tool calling API provided by the system. Do NOT manually type `<function>` tags. Do NOT put JSON inside the tool name field.
- **Don't Search For What You Have**: If the file content is already provided in your context, do NOT call `read_file` or `search_code` on it. Just read the context!

---

## PLANNING WORKFLOW (For complex tasks):
1. **PLAN FIRST**: Use `create_plan` to write a high-fidelity implementation plan before starting complex work.
2. **EXECUTE**: Follow your plan step-by-step using your rich suite of tools.
3. **VERIFY**: Run builds/tests and use `open_browser` to verify.
4. **DOCUMENT**: Use `create_walkthrough` to summarize tested paths and changes.
5. **SAVED CONTEXT**: Persist important architectural details in `.aeres/context/` using `save_context`.

---

## INTERNAL MONOLOGUE (CHAIN OF THOUGHT):
You MUST wrap your reasoning process inside `<scratchpad>` and `</scratchpad>` tags before calling any tool or outputting text.
Use the scratchpad to analyze the current state, decide your next action, and reflect on the output of previous steps.

Example:
<scratchpad>
The build failed with "SyntaxError: Unexpected token". The traceback points to App.jsx line 45. I will read App.jsx first to locate the syntax error, rewrite the section surgically using edit_file, and re-run the build.
</scratchpad>
[tool call goes here]

---

## SETUP & DIRECTORIES (ALL LANGS & FRAMEWORKS):
- On Windows, use backslashes for paths and 'dir' instead of 'ls'.

### 🛠️ Language & Framework Setup Guidelines:
1. **Python (FastAPI, Flask, Django)**: Check for `venv` via `run_command("dir venv")`. If missing, run `run_in_terminal("python -m venv venv")`. Activate it (`venv\\Scripts\\activate` on Windows, `source venv/bin/activate` on UNIX) and run `pip install -r requirements.txt` or `poetry install`.
2. **Node.js (React, Next.js, Electron, Vite, Express)**: Check for `node_modules`. If missing, run `run_in_terminal("npm install")` (or `pnpm install` / `yarn install`). Run dev server using `npm run dev` or `npm start`.
3. **Go (Gin, Fiber)**: Initialize/align dependencies using `run_in_terminal("go mod tidy")`. Build/run with `go build` or `go run .`.
4. **Rust (Actix, Tokio, Cargo)**: Compile using `run_in_terminal("cargo build")`. Run using `cargo run` and test with `cargo test`.
5. **C# / .NET (ASP.NET Core)**: Restore packages and build via `run_in_terminal("dotnet build")`. Run using `dotnet run` or hot-reload with `dotnet watch`.
6. **C/C++ (CMake, Makefile)**: Generate build files via `cmake .` or run `make` / `mingw32-make`.
7. **Java / Kotlin (Spring Boot)**: For Maven, run `run_in_terminal("./mvnw clean install")` or `mvn install`. For Gradle, run `./gradlew build` or `gradle build`.
8. **PHP (Laravel)**: Install packages via `composer install`. Run server via `php artisan serve`.
9. **Ruby (Rails)**: Run `bundle install` and launch server via `rails server`.

### 🔍 Active Compiler & Syntax Verifications:
After editing or compiling, always run syntax/type checks:
- **TypeScript**: `npx tsc --noEmit`
- **Python**: `python -m py_compile <file>`
- **Go/Rust/C#**: Re-run the compile command (`go build` / `cargo check` / `dotnet build`) to assert 100% syntactical correctness.
"""

# ──────────────────────────────────────────
# Tool Execution (Server-side for read-only tools)
# ──────────────────────────────────────────

def execute_read_file(args: dict, root_path: str) -> str:
    """Read a file's content."""
    fp = args.get("file_path", "")
    if not os.path.isabs(fp):
        fp = os.path.join(root_path, fp)
    try:
        with open(fp, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        lines = content.split("\n")
        if len(lines) > 500:
            return f"[File: {fp} — {len(lines)} lines, showing first 500]\n" + "\n".join(lines[:500]) + "\n... (truncated)"
        return f"[File: {fp} — {len(lines)} lines]\n{content}"
    except FileNotFoundError:
        return f"Error: File not found: {fp}"
    except Exception as e:
        return f"Error reading file: {e}"

def execute_search_code(args: dict, root_path: str) -> str:
    """Search the codebase for a pattern."""
    query = args.get("query", "")
    file_pattern = args.get("file_pattern", "")
    
    results = []
    skip = {".git", "node_modules", "venv", "__pycache__", ".next", "dist", "build", ".venv"}
    valid_exts = {".js", ".jsx", ".ts", ".tsx", ".py", ".css", ".html", ".json", ".md",
                  ".go", ".rs", ".c", ".cpp", ".java", ".rb", ".php", ".yml", ".yaml", ".toml",
                  ".sh", ".sql", ".dart", ".kt", ".swift", ".cs", ".lua", ".r"}
    
    for root, dirs, files in os.walk(root_path):
        dirs[:] = [d for d in dirs if d not in skip]
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            if file_pattern:
                import fnmatch
                if not fnmatch.fnmatch(f, file_pattern):
                    continue
            elif ext not in valid_exts:
                continue
            
            fp = os.path.join(root, f)
            try:
                with open(fp, "r", encoding="utf-8", errors="replace") as fh:
                    for i, line in enumerate(fh, 1):
                        if query.lower() in line.lower():
                            rel = os.path.relpath(fp, root_path)
                            results.append(f"  {rel}:{i}  {line.strip()[:120]}")
                            if len(results) > 50:
                                return f"Found {len(results)}+ matches for '{query}':\n" + "\n".join(results)
            except:
                continue
    
    if not results:
        return f"No matches found for '{query}'"
    return f"Found {len(results)} matches for '{query}':\n" + "\n".join(results)

def execute_list_directory(args: dict, root_path: str) -> str:
    """List directory contents."""
    dir_path = args.get("path", root_path)
    recursive = args.get("recursive", False)
    
    if not os.path.isabs(dir_path):
        dir_path = os.path.join(root_path, dir_path)
    
    if not os.path.isdir(dir_path):
        return f"Error: Not a directory: {dir_path}"
    
    skip = {".git", "node_modules", "venv", "__pycache__", ".next", "dist", "build", ".venv"}
    output = [f"[Directory: {dir_path}]"]
    
    def list_level(path, prefix="", depth=0):
        if depth > (3 if recursive else 0):
            return
        try:
            entries = sorted(os.listdir(path))
        except:
            return
        for entry in entries:
            if entry in skip:
                continue
            full = os.path.join(path, entry)
            is_dir = os.path.isdir(full)
            icon = "[DIR]" if is_dir else "[FILE]"
            output.append(f"{prefix}{icon} {entry}")
            if is_dir and recursive:
                list_level(full, prefix + "  ", depth + 1)
    
    list_level(dir_path)
    return "\n".join(output[:200])

def execute_run_command_local(args: dict, root_path: str) -> str:
    """Execute a command locally (fallback when IPC isn't available)."""
    cmd = args.get("command", "")
    cwd = args.get("cwd", root_path)
    
    try:
        result = subprocess.run(
            cmd, shell=True, cwd=cwd,
            capture_output=True, text=True, timeout=30,
            encoding="utf-8", errors="replace"
        )
        output = ""
        if result.stdout:
            output += result.stdout[:3000]
        if result.stderr:
            output += "\n[STDERR]\n" + result.stderr[:1000]
        output += f"\n[Exit code: {result.returncode}]"
        return output.strip()
    except subprocess.TimeoutExpired:
        return "[Command timed out after 30 seconds]"
    except Exception as e:
        return f"[Command error: {e}]"


def execute_search_web(query: str) -> str:
    """Search DuckDuckGo HTML without external API keys and return premium structured text."""
    import urllib.parse
    from bs4 import BeautifulSoup
    try:
        url = "https://html.duckduckgo.com/html/"
        data = urllib.parse.urlencode({"q": query}).encode("utf-8")
        req = urllib.request.Request(
            url, 
            data=data,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                "Content-Type": "application/x-www-form-urlencoded"
            }
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read()
            soup = BeautifulSoup(html, "html.parser")
            results = []
            
            # Look for normal result blocks
            for r in soup.find_all("div", class_="result__body")[:5]:
                title_elem = r.find("a", class_="result__url")
                snippet_elem = r.find("a", class_="result__snippet")
                
                title = title_elem.text.strip() if title_elem else "Result"
                link = title_elem["href"] if title_elem and title_elem.has_attr("href") else "#"
                snippet = snippet_elem.text.strip() if snippet_elem else ""
                
                # Resolve DuckDuckGo redirect link if present
                if "uddg=" in link:
                    try:
                        parsed = urllib.parse.urlparse(link)
                        qs = urllib.parse.parse_qs(parsed.query)
                        if "uddg" in qs:
                            link = qs["uddg"][0]
                    except:
                        pass
                
                results.append(f"- **{title}**\n  URL: {link}\n  Snippet: {snippet}")
                
            if results:
                return "\n\n".join(results)
            return "No web results found."
    except Exception as e:
        return f"Web search error: {str(e)}"


def execute_find_symbol(symbol: str, root_path: str) -> str:
    """Find a symbol definition across Python, JavaScript, and TypeScript files with rich surrounding context."""
    matches = []
    py_fn = re.compile(rf"^\s*(def|async\s+def)\s+{re.escape(symbol)}\b")
    py_cl = re.compile(rf"^\s*class\s+{re.escape(symbol)}\b")
    js_fn = re.compile(rf"\b(function|class)\s+{re.escape(symbol)}\b")
    js_const = re.compile(rf"\b(const|let|var)\s+{re.escape(symbol)}\b")
    
    ignore_dirs = {".git", "node_modules", "dist", "build", "venv", ".venv", "__pycache__", ".aeres", ".next"}
    
    for root, dirs, files in os.walk(root_path):
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        for file in files:
            if not file.endswith((".py", ".js", ".jsx", ".ts", ".tsx")):
                continue
            fp = os.path.join(root, file)
            try:
                with open(fp, "r", encoding="utf-8", errors="ignore") as f:
                    lines = f.readlines()
                    
                for line_num, line in enumerate(lines, 1):
                    if (py_fn.search(line) or py_cl.search(line) or 
                        js_fn.search(line) or js_const.search(line) or
                        f"class {symbol}" in line or f"function {symbol}" in line or
                        f"interface {symbol}" in line or f"type {symbol}" in line):
                        
                        rel_path = os.path.relpath(fp, root_path)
                        
                        # Extract surrounding lines (5 before, 10 after)
                        start = max(0, line_num - 6)
                        end = min(len(lines), line_num + 11)
                        snippet_lines = []
                        for idx in range(start, end):
                            prefix = "--> " if idx == line_num - 1 else "    "
                            snippet_lines.append(f"{prefix}{idx+1}: {lines[idx].rstrip()}")
                        
                        snippet = "\n".join(snippet_lines)
                        matches.append(
                            f"- **{symbol}** defined in `{rel_path}` at line **{line_num}**:\n"
                            f"```\n{snippet}\n```"
                        )
                        break # One match per file is enough
            except Exception:
                pass
    if matches:
        return "\n\n".join(matches[:5])
    return f"Symbol '{symbol}' not found in codebase."


# Global dictionary to track pending user confirmation steps (Legacy - now using temp files)
# PENDING_EDITS: Dict[str, dict] = {}


# ──────────────────────────────────────────
# Agent Loop — The Main Brain
# ──────────────────────────────────────────

async def run_agent_loop(
    instruction: str,
    context: str,
    file_path: str,
    root_path: str,
    conversation: List[dict] = None,
    images: List[str] = None,
    max_iterations: int = 20,
    api_key: str = None,
) -> AsyncGenerator[dict, None]:
    """
    Run the agentic loop. Yields step events as dicts:
    - { type: "thinking", content: "..." }
    - { type: "tool_call", tool: "read_file", args: {...}, id: "..." }
    - { type: "tool_result", tool: "read_file", result: "...", id: "..." }
    - { type: "needs_confirm", tool: "write_file", args: {...}, id: "..." }
    - { type: "message", content: "final answer" }
    - { type: "error", content: "..." }
    """
    
    # Build initial message history
    messages = [{"role": "system", "content": AGENT_SYSTEM_PROMPT}]
    
    # Add conversation history if provided
    if conversation:
        for msg in conversation[-10:]:  # last 10 messages for context
            messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
    
    # Build the user message with context
    user_msg = instruction
    if file_path:
        user_msg += f"\n\n[Active file: {file_path}]"
    if context:
        user_msg += f"\n\n[File content preview (first 2000 chars)]:\n{context[:2000]}"
    user_msg += f"\n\n[Workspace root: {root_path}]"
    
    # Load persisted context notes from .aeres/context/
    context_dir = os.path.join(root_path, ".aeres", "context")
    if os.path.isdir(context_dir):
        notes = []
        for f in sorted(os.listdir(context_dir)):
            if f.endswith('.md'):
                try:
                    with open(os.path.join(context_dir, f), 'r', encoding='utf-8') as fh:
                        notes.append(f"### {f[:-3]}\n{fh.read()[:500]}")
                except:
                    pass
        if notes:
            user_msg += "\n\n[Saved project context notes]:\n" + "\n\n".join(notes[:5])
    
    # Add RAG context
    try:
        rag_results = query_relevant_fix(instruction, n_results=2)
        if rag_results:
            rag_context = "\n".join([r["document"][:300] for r in rag_results])
            user_msg += f"\n\n[Related documentation]:\n{rag_context}"
    except:
        pass
    
    if images:
        content = [{"type": "text", "text": user_msg}]
        for img in images:
            if not img.startswith("data:"):
                img = f"data:image/jpeg;base64,{img}"
            content.append({
                "type": "image_url",
                "image_url": {
                    "url": img
                }
            })
        messages.append({"role": "user", "content": content})
    else:
        messages.append({"role": "user", "content": user_msg})
    
    yield {"type": "thinking", "content": "Understanding your request..."}
    
    for iteration in range(max_iterations):
        try:
            response = await groq_tool_complete(
                messages=messages,
                tools=AGENT_TOOLS,
                max_tokens=4000,
                temperature=0.1,
                api_key=api_key,
            )
        except Exception as e:
            err_str = str(e)
            if "tool call validation failed" in err_str or "attempted to call tool" in err_str or "tool_use_failed" in err_str or "Failed to call a function" in err_str:
                yield {"type": "thinking", "content": "Recovering from formatting error, retrying..."}
                
                # Append a strict reminder to the messages history before retrying
                messages.append({
                    "role": "user", 
                    "content": "SYSTEM ALERT: Your previous generation failed because you output raw XML `<function>` tags or malformed tool calls. You MUST use the native JSON function calling schema. Do NOT type `<function>` manually."
                })
                
                try:
                    response = await groq_tool_complete(
                        messages=messages,
                        tools=AGENT_TOOLS,
                        max_tokens=4000,
                        temperature=0.1,
                        api_key=api_key,
                    )
                except Exception as e2:
                    yield {"type": "error", "content": f"Groq API fallback error: {str(e2)}"}
                    return
            else:
                yield {"type": "error", "content": f"Groq API error: {err_str}"}
                return
        
        choice = response.choices[0] if response.choices else None
        if not choice:
            yield {"type": "error", "content": "No response from AI model"}
            return
        
        message = choice.message
        
        # If the model wants to call tools
        if message.tool_calls:
            # Add the assistant message to history
            messages.append({
                "role": "assistant",
                "content": message.content or "",
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        }
                    }
                    for tc in message.tool_calls
                ]
            })
            
            for tc in message.tool_calls:
                tool_name = tc.function.name
                try:
                    tool_args = json.loads(tc.function.arguments)
                except json.JSONDecodeError:
                    tool_args = {}
                
                yield {
                    "type": "tool_call",
                    "tool": tool_name,
                    "args": tool_args,
                    "id": tc.id,
                    "iteration": iteration + 1,
                }
                
                # Execute the tool
                result = ""
                
                if tool_name == "read_file":
                    result = execute_read_file(tool_args, root_path)
                    
                elif tool_name == "search_code":
                    result = execute_search_code(tool_args, root_path)
                    
                elif tool_name == "list_directory":
                    result = execute_list_directory(tool_args, root_path)
                    
                elif tool_name == "run_command":
                    result = execute_run_command_local(tool_args, root_path)
                    
                elif tool_name == "run_in_terminal":
                    # Forward to IDE's visible terminal
                    yield {
                        "type": "run_in_terminal",
                        "command": tool_args.get("command", ""),
                        "id": tc.id,
                    }
                    result = f"Command sent to IDE terminal: {tool_args.get('command', '')}"
                    
                elif tool_name == "debug_file":
                    # Forward to IDE's debug panel
                    yield {
                        "type": "debug_file",
                        "file_path": tool_args.get("file_path", ""),
                        "id": tc.id,
                    }
                    result = f"Debug session launched for: {tool_args.get('file_path', '')}"
                    
                elif tool_name in ("write_file", "edit_file", "multi_edit_file"):
                    import tempfile
                    import json
                    edit_file_path = os.path.join(tempfile.gettempdir(), f"aeres_edit_{tc.id}.json")
                    try:
                        with open(edit_file_path, "w", encoding="utf-8") as f:
                            json.dump({
                                "status": "pending",
                                "tool": tool_name,
                                "args": tool_args,
                                "result": None
                            }, f)
                    except Exception:
                        pass
                    
                    yield {
                        "type": "needs_confirm",
                        "tool": tool_name,
                        "args": tool_args,
                        "id": tc.id,
                        "iteration": iteration + 1,
                    }
                    
                    # Block and poll until status is no longer "pending"
                    import time
                    start_wait = time.time()
                    status = "pending"
                    final_result = None
                    
                    while status == "pending":
                        await asyncio.sleep(0.5)
                        try:
                            if os.path.exists(edit_file_path):
                                with open(edit_file_path, "r", encoding="utf-8") as f:
                                    data = json.load(f)
                                    status = data.get("status", "pending")
                                    final_result = data.get("result")
                            else:
                                status = "rejected"
                        except Exception:
                            pass
                            
                        if time.time() - start_wait > 120:
                            status = "rejected"
                            final_result = "Timed out waiting for confirmation"
                            break
                            
                    try:
                        if os.path.exists(edit_file_path):
                            os.remove(edit_file_path)
                    except Exception:
                        pass
                        
                    if status == "approved":
                        result = final_result or f"File edit successfully applied: {tool_args.get('file_path', '')}"
                    else:
                        result = f"Edit rejected or failed: {final_result or 'User rejected the edit'}"
                    
                elif tool_name == "ask_user":
                    yield {
                        "type": "ask_user",
                        "question": tool_args.get("question", ""),
                        "id": tc.id,
                    }
                    result = "Question sent to user. Waiting for response."
                
                elif tool_name == "read_url":
                    url = tool_args.get("url", "")
                    try:
                        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 Aeres/1.0'})
                        with urllib.request.urlopen(req, timeout=10) as response:
                            html = response.read().decode('utf-8')
                            # Simple HTML tag stripping
                            text = re.sub(r'<style.*?</style>', '', html, flags=re.DOTALL | re.IGNORECASE)
                            text = re.sub(r'<script.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
                            text = re.sub(r'<[^>]+>', ' ', text)
                            text = re.sub(r'\s+', ' ', text).strip()
                            result = text[:5000] # Return up to 5000 chars of text
                    except Exception as e:
                        result = f"Failed to fetch URL {url}: {str(e)}"
                
                elif tool_name == "semantic_search":
                    query = tool_args.get("query", "")
                    try:
                        results = query_relevant_fix(query, n_results=5)
                        if results:
                            lines = []
                            for idx, r in enumerate(results):
                                lines.append(f"Result {idx+1} (Source: {r.get('source_url', 'N/A')}, Function: {r.get('function', 'N/A')}):\n{r.get('document')}\n")
                            result = "\n".join(lines)
                        else:
                            result = "No semantically matching documents found."
                    except Exception as e:
                        result = f"Semantic search failed: {str(e)}"
                
                elif tool_name == "search_web":
                    query = tool_args.get("query", "")
                    result = execute_search_web(query)
                
                elif tool_name == "find_symbol":
                    symbol = tool_args.get("symbol", "")
                    result = execute_find_symbol(symbol, root_path)
                
                elif tool_name == "create_plan":
                    title = tool_args.get("title", "plan")
                    content = tool_args.get("content", "")
                    slug = re.sub(r'[^a-z0-9]+', '_', title.lower()).strip('_')
                    plan_dir = os.path.join(root_path, ".aeres", "plans")
                    os.makedirs(plan_dir, exist_ok=True)
                    plan_path = os.path.join(plan_dir, f"{slug}.md")
                    with open(plan_path, 'w', encoding='utf-8') as fh:
                        fh.write(f"# {title}\n\n{content}")
                    yield {
                        "type": "artifact_created",
                        "artifact_type": "plan",
                        "title": title,
                        "path": plan_path,
                        "id": tc.id,
                    }
                    result = f"Implementation plan saved to {plan_path}"
                
                elif tool_name == "create_walkthrough":
                    title = tool_args.get("title", "walkthrough")
                    content = tool_args.get("content", "")
                    slug = re.sub(r'[^a-z0-9]+', '_', title.lower()).strip('_')
                    wt_dir = os.path.join(root_path, ".aeres", "walkthroughs")
                    os.makedirs(wt_dir, exist_ok=True)
                    wt_path = os.path.join(wt_dir, f"{slug}.md")
                    with open(wt_path, 'w', encoding='utf-8') as fh:
                        fh.write(f"# {title}\n\n{content}")
                    yield {
                        "type": "artifact_created",
                        "artifact_type": "walkthrough",
                        "title": title,
                        "path": wt_path,
                        "id": tc.id,
                    }
                    result = f"Walkthrough saved to {wt_path}"
                
                elif tool_name == "save_context":
                    topic = tool_args.get("topic", "note")
                    content = tool_args.get("content", "")
                    slug = re.sub(r'[^a-z0-9]+', '_', topic.lower()).strip('_')
                    ctx_dir = os.path.join(root_path, ".aeres", "context")
                    os.makedirs(ctx_dir, exist_ok=True)
                    ctx_path = os.path.join(ctx_dir, f"{slug}.md")
                    with open(ctx_path, 'w', encoding='utf-8') as fh:
                        fh.write(f"# {topic}\n\n{content}")
                    yield {
                        "type": "context_saved",
                        "topic": topic,
                        "path": ctx_path,
                        "id": tc.id,
                    }
                    result = f"Context note '{topic}' saved to {ctx_path}"
                
                elif tool_name == "open_browser":
                    url = tool_args.get("url", "")
                    reason = tool_args.get("reason", "")
                    yield {
                        "type": "open_browser",
                        "url": url,
                        "reason": reason,
                        "id": tc.id,
                    }
                    result = f"Browser opened: {url}"
                    
                else:
                    result = f"Unknown tool: {tool_name}"
                
                # Smart result truncation to keep loop fast & accurate
                if len(result) > 4000:
                    truncated_result = result[:4000] + "\n\n[Warning: Tool output truncated. Use more specific filters or target lines to view additional data.]"
                else:
                    truncated_result = result
                
                # Yield the result
                yield {
                    "type": "tool_result",
                    "tool": tool_name,
                    "result": truncated_result,
                    "id": tc.id,
                }
                
                # Add tool result to message history
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": truncated_result,
                })
        
        else:
            # Model returned a final text response — we're done
            final = message.content or ""
            yield {"type": "message", "content": final}
            return
    
    # If we hit max iterations
    yield {"type": "message", "content": "I've reached the maximum number of steps. Here's what I've done so far — you can ask me to continue if needed."}
