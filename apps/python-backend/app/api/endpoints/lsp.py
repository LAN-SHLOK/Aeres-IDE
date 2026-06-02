import os
import subprocess
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import ast

router = APIRouter()

class DiagnoseRequest(BaseModel):
    file_path: str

class Diagnostic(BaseModel):
    source: str
    message: str
    line: int
    severity: str

@router.post("/diagnostics")
async def get_diagnostics(req: DiagnoseRequest):
    path = req.file_path
    if not os.path.exists(path):
        return {"diagnostics": []}
    
    ext = os.path.splitext(path)[1].lower()
    diagnostics = []

    try:
        if ext in [".py"]:
            # Basic AST syntax check
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            try:
                ast.parse(content)
            except SyntaxError as e:
                diagnostics.append(Diagnostic(
                    source="python-syntax",
                    message=str(e),
                    line=e.lineno or 1,
                    severity="Error"
                ))
                
        elif ext in [".js", ".jsx", ".ts", ".tsx"]:
            # Try to run node -c
            result = subprocess.run(
                ["node", "-c", path],
                capture_output=True,
                text=True
            )
            if result.returncode != 0:
                # Extract first line of error roughly
                err_line = result.stderr.split("\n")[0]
                diagnostics.append(Diagnostic(
                    source="node-syntax",
                    message=err_line,
                    line=1, # Default to 1, parsing exact line from Node output is complex
                    severity="Error"
                ))

    except Exception as e:
        print(f"Error checking diagnostics: {e}")

    return {"diagnostics": [d.model_dump() for d in diagnostics]}
