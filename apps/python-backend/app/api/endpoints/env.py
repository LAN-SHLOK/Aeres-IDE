from fastapi import APIRouter
import shutil
from pydantic import BaseModel
import os

router = APIRouter()

class EnvScanRequest(BaseModel):
    root_path: str

@router.post("/scan")
async def scan_env(req: EnvScanRequest):
    envs = []
    
    # Check Python
    python_path = shutil.which("python") or shutil.which("python3")
    if python_path:
        envs.append({"name": "Python (System)", "type": "python", "path": python_path})
        
    # Check Node
    node_path = shutil.which("node")
    if node_path:
        envs.append({"name": "Node.js (System)", "type": "node", "path": node_path})
        
    # Check Git
    git_path = shutil.which("git")
    if git_path:
        envs.append({"name": "Git", "type": "git", "path": git_path})
        
    # Add virtualenv if exists in root_path
    venv_path = os.path.join(req.root_path, "venv", "Scripts", "python.exe") if os.name == 'nt' else os.path.join(req.root_path, "venv", "bin", "python")
    if os.path.exists(venv_path):
        envs.append({"name": "Python (venv)", "type": "python", "path": venv_path})
        
    # Add node_modules bin if exists
    node_bin = os.path.join(req.root_path, "node_modules", ".bin", "node")
    if os.path.exists(node_bin):
        envs.append({"name": "Node (Project)", "type": "node", "path": node_bin})
        
    return envs
