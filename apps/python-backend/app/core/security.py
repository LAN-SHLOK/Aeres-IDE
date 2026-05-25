import time
import os
from typing import Annotated, Any, Dict, List, Optional

import httpx
from fastapi import Header, HTTPException
from jose import JWTError, jwt, jwk

from app.core.config import settings

_jwks_cache: Dict[str, Any] = {"keys": [], "fetched_at": 0.0}
CACHE_TTL = 3600


async def _get_jwks() -> List[dict]:
    now = time.time()
    if _jwks_cache["keys"] and (now - _jwks_cache["fetched_at"]) < CACHE_TTL:
        return _jwks_cache["keys"]
    issuer = settings.CLERK_JWT_ISSUER.rstrip("/")
    url = f"{issuer}/.well-known/jwks.json"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, timeout=10.0)
        resp.raise_for_status()
        data = resp.json()
    _jwks_cache["keys"] = data.get("keys", [])
    _jwks_cache["fetched_at"] = now
    return _jwks_cache["keys"]


async def verify_clerk_jwt(token: str) -> dict:
    if not settings.CLERK_JWT_ISSUER:
        return {"sub": "dev-user", "email": "dev@localhost"}
    try:
        keys = await _get_jwks()
        header = jwt.get_unverified_header(token)
        key_data = next((k for k in keys if k.get("kid") == header.get("kid")), None)
        if not key_data:
            raise HTTPException(status_code=401, detail="JWT signing key not found")
        public_key = jwk.construct(key_data)
        pem = public_key.to_pem().decode("utf-8")
        payload = jwt.decode(
            token,
            pem,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        return payload
    except HTTPException:
        raise
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid JWT: {e}") from e
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"JWT validation failed: {e}") from e


async def get_current_user(
    authorization: Annotated[Optional[str], Header()] = None,
) -> dict:
    if os.environ.get("DEBUG_SKIP_AUTH") == "True":
        return {"sub": "debug-user", "email": "debug@aeres.ide"}

    if not authorization or not authorization.startswith("Bearer "):
        if not settings.CLERK_JWT_ISSUER:
            return {"sub": "dev-user", "email": "dev@localhost"}
        print("[Auth] Missing or invalid Authorization header")
        raise HTTPException(status_code=401, detail="Missing Bearer token")
    
    token = authorization.split(" ", 1)[1].strip()
    try:
        return await verify_clerk_jwt(token)
    except HTTPException as e:
        print(f"[Auth] Verification failed: {e.detail}")
        raise
    except Exception as e:
        print(f"[Auth] Unexpected auth error: {e}")
        raise HTTPException(status_code=401, detail=str(e))
