from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from app.core.security import get_current_user
from app.core.models import DepScanRequest
from app.agents.dep_scanner import scan_npm_deps, scan_python_deps
import asyncio, os

router = APIRouter()
scan_cache: dict = {}

@router.post("/scan")
async def scan_deps(body: DepScanRequest, background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    """Scan all manifest files in the project root and subdirectories."""
    if not os.path.exists(body.root_path):
        raise HTTPException(status_code=400, detail="Invalid root_path")
        
    root = body.root_path
    results = {'npm': [], 'pypi': [], 'errors': []}

    # Find all manifest files
    manifests = []
    for dirpath, dirnames, filenames in os.walk(root):
        # Skip node_modules and venv
        if 'node_modules' in dirnames: dirnames.remove('node_modules')
        if 'venv' in dirnames: dirnames.remove('venv')
        if '.git' in dirnames: dirnames.remove('.git')
        
        for f in filenames:
            if f == 'package.json':
                manifests.append(('npm', os.path.join(dirpath, f)))
            elif f == 'requirements.txt':
                manifests.append(('pypi', os.path.join(dirpath, f)))

    tasks = []
    manifest_types = []
    for mtype, path in manifests:
        if mtype == 'npm':
            tasks.append(scan_npm_deps(path))
        else:
            tasks.append(scan_python_deps(path))
        manifest_types.append(mtype)
            
    results_list = await asyncio.gather(*tasks)
    
    for i, res in enumerate(results_list):
        mtype = manifest_types[i]
        if mtype == 'npm':
            results['npm'].extend(res)
        else:
            results['pypi'].extend(res)

    scan_cache[root] = results
    return results

@router.get("/cached")
async def get_cached(root_path: str, user: dict = Depends(get_current_user)):
    """Retrieve the last scanned health map for a project."""
    return scan_cache.get(root_path, None)

@router.get("/status")
async def get_status():
    return {"status": "active", "feature": "dependency_drift_radar"}
