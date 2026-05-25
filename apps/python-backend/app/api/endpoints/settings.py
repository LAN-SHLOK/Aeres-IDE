from __future__ import annotations
import os
import json
from typing import Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from platformdirs import user_config_dir

from app.core.security import get_current_user

router = APIRouter()

CONFIG_DIR = user_config_dir("AeresIDE", "Aeres")
SETTINGS_FILE = os.path.join(CONFIG_DIR, "settings.json")

class SettingsUpdate(BaseModel):
    settings: dict[str, Any]

def ensure_config_dir():
    if not os.path.exists(CONFIG_DIR):
        os.makedirs(CONFIG_DIR, exist_ok=True)
    if not os.path.exists(SETTINGS_FILE):
        with open(SETTINGS_FILE, "w") as f:
            json.dump({
                "editor.fontSize": 14,
                "editor.fontFamily": "'JetBrains Mono', monospace",
                "editor.lineHeight": 1.6,
                "editor.minimap": True,
                "workbench.colorTheme": "aeres-dark",
                "workbench.sidebar.location": "left"
            }, f, indent=2)

@router.get("/")
async def get_settings(user: dict = Depends(get_current_user)):
    """Retrieve global user settings."""
    ensure_config_dir()
    try:
        with open(SETTINGS_FILE, "r") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read settings: {str(e)}")

@router.put("/")
async def update_settings(req: SettingsUpdate, user: dict = Depends(get_current_user)):
    """Update global user settings."""
    ensure_config_dir()
    try:
        current_settings = {}
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, "r") as f:
                current_settings = json.load(f)
        
        current_settings.update(req.settings)
        
        with open(SETTINGS_FILE, "w") as f:
            json.dump(current_settings, f, indent=2)
        
        return {"status": "success", "settings": current_settings}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update settings: {str(e)}")
