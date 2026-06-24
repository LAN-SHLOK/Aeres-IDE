from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any

from app.core.config import settings, update_settings_file

router = APIRouter()

class KeysUpdate(BaseModel):
    GROQ_API_KEY: str | None = None
    IDE_DIAGRAM_ENGINE: str | None = None
    GOOGLE_API_KEY: str | None = None
    GITHUB_TOKEN: str | None = None
    CLERK_SECRET_KEY: str | None = None

@router.get("/")
async def get_keys() -> Dict[str, Any]:
    """Returns the current API keys, masking sensitive portions."""
    def mask_key(key: str) -> str:
        if not key:
            return ""
        if len(key) <= 8:
            return "*" * len(key)
        return f"{key[:4]}...{key[-4:]}"

    return {
        "GROQ_API_KEY": mask_key(settings.GROQ_API_KEY),
        "GOOGLE_API_KEY": mask_key(settings.GOOGLE_API_KEY),
        "GITHUB_TOKEN": mask_key(settings.GITHUB_TOKEN),
        "CLERK_SECRET_KEY": mask_key(settings.CLERK_SECRET_KEY),
        "is_configured": bool(settings.GROQ_API_KEY),
    }

@router.post("/")
async def update_keys(updates: KeysUpdate):
    """Updates the user config with new API keys."""
    valid_updates = {k: v for k, v in updates.model_dump().items() if v is not None}
    
    if not valid_updates:
        raise HTTPException(status_code=400, detail="No updates provided")
        
    try:
        update_settings_file(valid_updates)
        return {"status": "success", "message": "API Keys updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update API keys: {str(e)}")
