from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.core.models import ObservationRequest, GenerateTestsRequest
from app.agents.contract_observer import record_observation, generate_snapshot_tests, observations
import os
import re
import ast

router = APIRouter()


@router.post("/observe")
async def record(body: ObservationRequest, user: dict = Depends(get_current_user)):
    """Record a function I/O observation from a debug/run session."""
    norm_path = os.path.normpath(body.file_path).lower().replace('\\', '/')
    record_observation(norm_path, body.function_name, body.inputs, body.output, body.error)
    key = f"{norm_path}:{body.function_name}"
    obs_count = len(observations.get(key, []))
    # Suggest test generation after 5 unique observations
    return {"count": obs_count, "suggestGenerate": obs_count >= 5 and obs_count % 5 == 0}


@router.post("/generate")
async def generate(body: GenerateTestsRequest, user: dict = Depends(get_current_user)):
    tests = generate_snapshot_tests(body.file_path, body.function_name, body.language)
    
    if "TODO" in tests:
        try:
            from app.rag_engine.groq_gateway import groq_complete
            system = "You are an expert software engineer. The user will provide a test file containing `TODO` placeholders and comments documenting inputs and expected outputs. Implement the missing logic to satisfy the assertions. Output ONLY the raw code."
            user_prompt = f"{tests}"
            filled = await groq_complete(system, user_prompt, max_tokens=2048)
            if filled:
                if filled.startswith("```"):
                    lines = filled.split("\n")
                    if lines[-1].strip() == "```":
                        lines = lines[:-1]
                    filled = "\n".join(lines[1:])
                tests = filled
        except Exception as e:
            print(f"[contracts/generate] LLM test completion failed: {e}")

    return {"tests": tests, "language": body.language}


@router.get("/summary")
async def get_summary(file_path: str, user: dict = Depends(get_current_user)):
    """Get a summary of all observed and statically-detected functions for the current file."""
    norm_path = os.path.normpath(file_path).lower().replace('\\', '/')

    summary = []
    observed_functions = set()

    for key, obs in observations.items():
        if key.lower().startswith(norm_path.lower()):
            parts = key.rsplit(':', 1)
            if len(parts) < 2:
                continue
            fn = parts[1]
            observed_functions.add(fn)
            summary.append({
                "function": fn,
                "callCount": len(obs),
                "edgeCases": sum(1 for o in obs if o['isEdgeCase'])
            })

    # AST / regex fallback: parse function definitions in the active file
    if os.path.exists(file_path):
        try:
            with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()

            ext = os.path.splitext(file_path)[1].lower()
            ast_functions = []

            # ── Python — full AST ──────────────────────────────────────────
            if ext in ('.py', '.pyw', '.pyi'):
                try:
                    tree = ast.parse(content)
                    for node in ast.walk(tree):
                        if isinstance(node, ast.FunctionDef) and not node.name.startswith('_'):
                            ast_functions.append({
                                "function": node.name,
                                "callCount": 0,
                                "edgeCases": len(node.args.args)
                            })
                except SyntaxError:
                    pass

            # ── JavaScript / TypeScript ───────────────────────────────────
            elif ext in ('.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts'):
                matches = re.findall(
                    r'(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\('
                    r'|(?:export\s+)?const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:async\s*)?\(',
                    content
                )
                skip = {'describe', 'it', 'test', 'expect', 'require', 'beforeEach', 'afterEach', 'beforeAll', 'afterAll'}
                found = set()
                for m in matches:
                    fn = m[0] or m[1]
                    if fn and fn not in found and fn not in skip:
                        found.add(fn)
                        ast_functions.append({"function": fn, "callCount": 0, "edgeCases": 0})

            # ── Go ────────────────────────────────────────────────────────
            elif ext == '.go':
                matches = re.findall(r'^func\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(', content, re.MULTILINE)
                skip = {'init', 'main'}
                for fn in matches:
                    if fn not in skip:
                        ast_functions.append({"function": fn, "callCount": 0, "edgeCases": 0})

            # ── Rust ──────────────────────────────────────────────────────
            elif ext == '.rs':
                matches = re.findall(r'(?:pub\s+)?(?:async\s+)?fn\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(', content)
                skip = {'main', 'new', 'drop', 'fmt', 'from', 'into', 'default'}
                for fn in matches:
                    if fn not in skip:
                        ast_functions.append({"function": fn, "callCount": 0, "edgeCases": 0})

            # ── Ruby ──────────────────────────────────────────────────────
            elif ext == '.rb':
                matches = re.findall(r'^\s*def\s+([A-Za-z_][A-Za-z0-9_?!]*)', content, re.MULTILINE)
                for fn in matches:
                    if not fn.startswith('_'):
                        ast_functions.append({"function": fn, "callCount": 0, "edgeCases": 0})

            # ── Java ──────────────────────────────────────────────────────
            elif ext == '.java':
                matches = re.findall(
                    r'(?:public|protected|private|static|\s)+[\w<>\[\]]+\s+([A-Za-z_][A-Za-z0-9_]*)\s*\([^)]*\)\s*(?:throws\s+\w+\s*)?\{',
                    content
                )
                skip = {'if', 'for', 'while', 'switch', 'catch', 'class', 'interface'}
                for fn in matches:
                    if fn not in skip:
                        ast_functions.append({"function": fn, "callCount": 0, "edgeCases": 0})

            # ── Kotlin ────────────────────────────────────────────────────
            elif ext in ('.kt', '.kts'):
                matches = re.findall(r'(?:fun\s+)([A-Za-z_][A-Za-z0-9_]*)\s*\(', content)
                for fn in matches:
                    ast_functions.append({"function": fn, "callCount": 0, "edgeCases": 0})

            # ── C# ────────────────────────────────────────────────────────
            elif ext == '.cs':
                matches = re.findall(
                    r'(?:public|private|protected|internal|static|virtual|override|async|\s)+\s+[\w<>\[\]?]+\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(',
                    content
                )
                skip = {'if', 'for', 'while', 'switch', 'catch'}
                for fn in matches:
                    if fn not in skip:
                        ast_functions.append({"function": fn, "callCount": 0, "edgeCases": 0})

            # ── C / C++ ───────────────────────────────────────────────────
            elif ext in ('.c', '.cpp', '.cc', '.cxx', '.h', '.hpp'):
                matches = re.findall(
                    r'^(?:[\w:*&<>]+\s+)+([A-Za-z_][A-Za-z0-9_:]*)\s*\([^)]*\)\s*(?:const\s*)?\{',
                    content, re.MULTILINE
                )
                skip = {'if', 'for', 'while', 'switch', 'TEST', 'ASSERT'}
                for fn in matches:
                    if fn not in skip and '::' not in fn:
                        ast_functions.append({"function": fn, "callCount": 0, "edgeCases": 0})

            # ── PHP ───────────────────────────────────────────────────────
            elif ext == '.php':
                matches = re.findall(
                    r'(?:public|protected|private|static|\s)*function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(',
                    content
                )
                for fn in matches:
                    ast_functions.append({"function": fn, "callCount": 0, "edgeCases": 0})

            # ── Swift ─────────────────────────────────────────────────────
            elif ext == '.swift':
                matches = re.findall(
                    r'(?:public|private|internal|fileprivate|open|\s)*(?:override\s+)?func\s+([A-Za-z_][A-Za-z0-9_]*)\s*[(<]',
                    content
                )
                for fn in matches:
                    ast_functions.append({"function": fn, "callCount": 0, "edgeCases": 0})

            # ── Dart ──────────────────────────────────────────────────────
            elif ext == '.dart':
                matches = re.findall(
                    r'(?:Future|void|String|int|double|bool|List|Map|dynamic|\w+)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(',
                    content
                )
                skip = {'main', 'build', 'initState', 'dispose'}
                for fn in matches:
                    if fn not in skip:
                        ast_functions.append({"function": fn, "callCount": 0, "edgeCases": 0})

            # ── Lua ───────────────────────────────────────────────────────
            elif ext == '.lua':
                matches = re.findall(
                    r'(?:local\s+)?function\s+([A-Za-z_][A-Za-z0-9_.:]*)\s*\(',
                    content
                )
                for fn in matches:
                    ast_functions.append({"function": fn, "callCount": 0, "edgeCases": 0})

            # ── Elixir ────────────────────────────────────────────────────
            elif ext in ('.ex', '.exs'):
                matches = re.findall(r'^\s*(?:def|defp)\s+([A-Za-z_][A-Za-z0-9_?!]*)', content, re.MULTILINE)
                for fn in matches:
                    ast_functions.append({"function": fn, "callCount": 0, "edgeCases": 0})

            # ── Haskell ───────────────────────────────────────────────────
            elif ext == '.hs':
                matches = re.findall(r'^([A-Za-z_][A-Za-z0-9_\']*)\s*::', content, re.MULTILINE)
                for fn in matches:
                    if fn[0].islower():  # functions start lowercase in Haskell
                        ast_functions.append({"function": fn, "callCount": 0, "edgeCases": 0})

            # ── Scala ─────────────────────────────────────────────────────
            elif ext == '.scala':
                matches = re.findall(r'def\s+([A-Za-z_][A-Za-z0-9_]*)\s*[(\[]?', content)
                for fn in matches:
                    ast_functions.append({"function": fn, "callCount": 0, "edgeCases": 0})

            # ── R ─────────────────────────────────────────────────────────
            elif ext in ('.r',):
                matches = re.findall(r'([A-Za-z_][A-Za-z0-9_.]*)\s*<-\s*function\s*\(', content)
                for fn in matches:
                    ast_functions.append({"function": fn, "callCount": 0, "edgeCases": 0})

            # ── Perl ──────────────────────────────────────────────────────
            elif ext in ('.pl', '.pm'):
                matches = re.findall(r'^sub\s+([A-Za-z_][A-Za-z0-9_]*)', content, re.MULTILINE)
                for fn in matches:
                    ast_functions.append({"function": fn, "callCount": 0, "edgeCases": 0})

            # ── Shell / Bash ───────────────────────────────────────────────
            elif ext in ('.sh', '.bash', '.zsh'):
                matches = re.findall(r'^([A-Za-z_][A-Za-z0-9_-]*)\s*\(\s*\)', content, re.MULTILINE)
                for fn in matches:
                    ast_functions.append({"function": fn, "callCount": 0, "edgeCases": 0})

            # ── PowerShell ────────────────────────────────────────────────
            elif ext in ('.ps1', '.psm1'):
                matches = re.findall(r'function\s+([A-Za-z_][A-Za-z0-9_-]*)', content, re.IGNORECASE)
                for fn in matches:
                    ast_functions.append({"function": fn, "callCount": 0, "edgeCases": 0})

            # ── Nim ───────────────────────────────────────────────────────
            elif ext == '.nim':
                matches = re.findall(r'^\s*(?:proc|func|method)\s+([A-Za-z_][A-Za-z0-9_]*)', content, re.MULTILINE)
                for fn in matches:
                    ast_functions.append({"function": fn, "callCount": 0, "edgeCases": 0})

            # ── Zig ───────────────────────────────────────────────────────
            elif ext == '.zig':
                matches = re.findall(r'(?:pub\s+)?fn\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(', content)
                for fn in matches:
                    ast_functions.append({"function": fn, "callCount": 0, "edgeCases": 0})

            # ── F# ────────────────────────────────────────────────────────
            elif ext in ('.fs', '.fsx', '.ml'):
                matches = re.findall(r'let\s+(?:rec\s+)?([A-Za-z_][A-Za-z0-9_\']*)\s+', content)
                for fn in matches:
                    if fn[0].islower():
                        ast_functions.append({"function": fn, "callCount": 0, "edgeCases": 0})

            # ── Clojure ───────────────────────────────────────────────────
            elif ext in ('.clj', '.cljs'):
                matches = re.findall(r'\(defn\s+([A-Za-z_\-][A-Za-z0-9_\-?!]*)', content)
                for fn in matches:
                    ast_functions.append({"function": fn, "callCount": 0, "edgeCases": 0})

            # ── Erlang ────────────────────────────────────────────────────
            elif ext == '.erl':
                matches = re.findall(r'^([a-z][A-Za-z0-9_]*)\s*\(', content, re.MULTILINE)
                skip = {'if', 'case', 'receive', 'try', 'catch'}
                for fn in matches:
                    if fn not in skip:
                        ast_functions.append({"function": fn, "callCount": 0, "edgeCases": 0})

            # ── Merge: add AST functions not yet observed ─────────────────
            seen = set()
            for af in ast_functions:
                fn_key = af["function"]
                if fn_key not in observed_functions and fn_key not in seen:
                    seen.add(fn_key)
                    summary.append(af)

        except Exception as e:
            print(f"[contracts/summary] AST fallback exception: {e}")

    return summary


@router.get("/status")
async def get_status():
    return {"status": "active", "feature": "contract_snapshot_tests", "languages": 25}
