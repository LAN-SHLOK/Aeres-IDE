from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.core.models import ObservationRequest, GenerateTestsRequest
from app.agents.contract_observer import record_observation, generate_snapshot_tests, observations
import os
import ast

router = APIRouter()

@router.post("/observe")
async def record(body: ObservationRequest, user: dict = Depends(get_current_user)):
    """Record a function I/O observation from a debug/run session."""
    record_observation(body.file_path, body.function_name, body.inputs, body.output, body.error)
    key = f"{body.file_path}:{body.function_name}"
    obs_count = len(observations.get(key, []))
    # Suggest test generation after 5 unique observations
    return {"count": obs_count, "suggestGenerate": obs_count >= 5 and obs_count % 5 == 0}

@router.post("/generate")
async def generate(body: GenerateTestsRequest, user: dict = Depends(get_current_user)):
    """Generate professional test code based on current observations."""
    tests = generate_snapshot_tests(body.file_path, body.function_name, body.language)
    return {"tests": tests, "language": body.language}

@router.get("/summary")
async def get_summary(file_path: str, user: dict = Depends(get_current_user)):
    """Get a summary of all observations for the current file."""
    summary = []
    for key, obs in observations.items():
        if key.startswith(file_path):
            fn = key.split(':')[1]
            summary.append({
                "function": fn, 
                "callCount": len(obs), 
                "edgeCases": sum(1 for o in obs if o['isEdgeCase'])
            })
    
    # Premium AST fallback: Parse function definitions in active file to propose snapshots
    if not summary and os.path.exists(file_path):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            # Simple AST parser for python files, regex/simple token fallback for JS/others
            if file_path.endswith('.py'):
                tree = ast.parse(content)
                for node in ast.walk(tree):
                    if isinstance(node, ast.FunctionDef) and not node.name.startswith('_'):
                        summary.append({
                            "function": node.name,
                            "callCount": 0,
                            "edgeCases": len(node.args.args)
                        })
            else:
                # Regex fallback for JavaScript, TypeScript, Go etc.
                import re
                matches = re.findall(r'(?:function|const|let)\s+([a-zA-Z0-9_]+)\s*=\s*(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>|function\s+([a-zA-Z0-9_]+)\s*\(', content)
                found = set()
                for m in matches:
                    fn = m[0] or m[1]
                    if fn and fn not in found and fn not in ('describe', 'it', 'test', 'expect', 'require'):
                        found.add(fn)
                        summary.append({
                            "function": fn,
                            "callCount": 0,
                            "edgeCases": 0
                        })
        except Exception as e:
            print("AST summary fallback exception:", e)
    return summary

@router.get("/status")
async def get_status():
    return {"status": "active", "feature": "contract_snapshot_tests"}
