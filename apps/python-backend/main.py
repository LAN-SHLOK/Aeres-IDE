import os
import sys

import uvicorn

if getattr(sys, "frozen", False):
    import platformdirs

    data_dir = platformdirs.user_data_dir("AeresIDE", "Aeres")
    os.makedirs(data_dir, exist_ok=True)
    os.environ["CHROMA_DB_PATH"] = os.path.join(data_dir, "chroma_db")
    os.environ["EMBEDDING_CACHE"] = os.path.join(data_dir, "model_cache")

port = int(os.environ.get("BACKEND_PORT", "8008"))

if __name__ == "__main__":
    uvicorn.run(
        "app.server:app",
        host="127.0.0.1",
        port=port,
        log_level="info",
        reload=True,
    )
