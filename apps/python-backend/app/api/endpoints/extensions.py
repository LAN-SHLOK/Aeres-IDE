from fastapi import APIRouter, HTTPException
import os
import json
import shutil

router = APIRouter()

from app.core.config import base_dir

def get_marketplace_data():
    marketplace_file = os.path.join(base_dir, "app", "data", "marketplace.json")
    try:
        with open(marketplace_file, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading marketplace.json: {e}")
        return []

def get_extensions_dir(workspace_root: str) -> str:
    # We will use an "extensions" directory at the root of the workspace
    ext_dir = os.path.join(workspace_root, "extensions")
    if not os.path.exists(ext_dir):
        try:
            os.makedirs(ext_dir)
        except Exception:
            pass
    return ext_dir

@router.get("/marketplace")
async def get_marketplace():
    """Returns the list of available extensions in the marketplace."""
    return [{"id": ext["id"], "name": ext["name"], "desc": ext["desc"], "author": ext["author"], "popular": ext.get("popular", False)} for ext in get_marketplace_data()]

@router.post("/installed")
async def get_installed(body: dict):
    """Scans the local extensions/ directory for installed extensions."""
    workspace_root = body.get("rootPath")
    if not workspace_root:
        return []
    
    ext_dir = get_extensions_dir(workspace_root)
    installed = []
    
    if os.path.exists(ext_dir):
        for entry in os.listdir(ext_dir):
            full_path = os.path.join(ext_dir, entry)
            if os.path.isdir(full_path):
                # Verify manifest exists
                if os.path.exists(os.path.join(full_path, "manifest.json")):
                    installed.append(entry)
                    
    return installed

@router.post("/install")
async def install_extension(body: dict):
    """Simulates downloading an extension to the local directory."""
    ext_id = body.get("id")
    workspace_root = body.get("rootPath")
    
    if not ext_id or not workspace_root:
        raise HTTPException(status_code=400, detail="Missing id or rootPath")
        
    marketplace = get_marketplace_data()
    ext_data = next((e for e in marketplace if e["id"] == ext_id), None)
    if not ext_data:
        raise HTTPException(status_code=404, detail="Extension not found in marketplace")
        
    ext_dir = get_extensions_dir(workspace_root)
    target_dir = os.path.join(ext_dir, ext_id)
    
    try:
        if not os.path.exists(target_dir):
            os.makedirs(target_dir)
            
        # Write manifest
        manifest = {
            "id": ext_data["id"],
            "name": ext_data["name"],
            "desc": ext_data["desc"],
            "author": ext_data["author"],
            "main": "main.js"
        }
        with open(os.path.join(target_dir, "manifest.json"), "w", encoding="utf-8") as f:
            json.dump(manifest, f)
            
        # Write main.js
        with open(os.path.join(target_dir, "main.js"), "w", encoding="utf-8") as f:
            f.write(ext_data.get("main_code", "module.exports = {};"))
            
        return {"success": True, "id": ext_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/uninstall")
async def uninstall_extension(body: dict):
    """Removes an extension from the local directory."""
    ext_id = body.get("id")
    workspace_root = body.get("rootPath")
    
    if not ext_id or not workspace_root:
        raise HTTPException(status_code=400, detail="Missing id or rootPath")
        
    ext_dir = get_extensions_dir(workspace_root)
    target_dir = os.path.join(ext_dir, ext_id)
    
    if os.path.exists(target_dir):
        try:
            shutil.rmtree(target_dir)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
            
    return {"success": True}

@router.post("/load_local")
async def load_local_extension(body: dict):
    """Copies a local extension directory into the workspace extensions directory."""
    source_dir = body.get("sourcePath")
    workspace_root = body.get("rootPath")
    if not source_dir or not workspace_root:
        raise HTTPException(status_code=400, detail="Missing sourcePath or rootPath")
    if not os.path.exists(source_dir) or not os.path.isdir(source_dir):
        raise HTTPException(status_code=400, detail="Invalid source directory")
    manifest_path = os.path.join(source_dir, "manifest.json")
    if not os.path.exists(manifest_path):
        raise HTTPException(status_code=400, detail="No manifest.json found in source directory")
    try:
        with open(manifest_path, "r", encoding="utf-8") as fm:
            manifest = json.load(fm)
            ext_id = manifest.get("id")
            if not ext_id:
                raise HTTPException(status_code=400, detail="Manifest missing id")
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid manifest.json")
        
    ext_dir = get_extensions_dir(workspace_root)
    target_dir = os.path.join(ext_dir, ext_id)
    try:
        if os.path.exists(target_dir):
            shutil.rmtree(target_dir)
        shutil.copytree(source_dir, target_dir)
        return {"success": True, "id": ext_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
