from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from app.core.security import get_current_user
from app.core.models import DepScanRequest
from app.agents.dep_scanner import scan_npm_deps, scan_python_deps
import asyncio, os

router = APIRouter()
scan_cache: dict = {}

@router.post("/scan")
async def scan_deps(body: DepScanRequest, background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    """Scan all manifest files in the project root."""
    if not os.path.exists(body.root_path):
        raise HTTPException(status_code=400, detail="Invalid root_path")
        
    root = body.root_path
    results = {'npm': [], 'pypi': [], 'errors': []}

    # Parallel scan
    pkg_json = os.path.join(root, 'package.json')
    req_txt = os.path.join(root, 'requirements.txt')
    
    tasks = []
    if os.path.exists(pkg_json):
        tasks.append(scan_npm_deps(pkg_json))
    if os.path.exists(req_txt):
        tasks.append(scan_python_deps(req_txt))
        
    results_list = await asyncio.gather(*tasks)
    
    if os.path.exists(pkg_json): results['npm'] = results_list[0]
    if os.path.exists(req_txt): results['pypi'] = results_list[-1]

    scan_cache[root] = results
    return results

@router.get("/cached")
async def get_cached(root_path: str, user: dict = Depends(get_current_user)):
    """Retrieve the last scanned health map for a project."""
    return scan_cache.get(root_path, None)

@router.get("/status")
async def get_status():
    return {"status": "active", "feature": "dependency_drift_radar"}
