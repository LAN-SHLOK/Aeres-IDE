import os
import sys

# ALWAYS set the working directory to the backend folder so Uvicorn reloader works!
os.chdir(os.path.dirname(os.path.abspath(__file__)))

import uvicorn
import asyncio

if os.name == 'nt':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

if getattr(sys, "frozen", False):
    import platformdirs
    import app.server

    data_dir = platformdirs.user_data_dir("AeresIDE", "Aeres")
    os.makedirs(data_dir, exist_ok=True)
    os.environ["CHROMA_DB_PATH"] = os.path.join(data_dir, "chroma_db")
    os.environ["EMBEDDING_CACHE"] = os.path.join(data_dir, "model_cache")

port = int(os.environ.get("BACKEND_PORT", "8008"))

if __name__ == "__main__":
    import multiprocessing
    multiprocessing.freeze_support()
    
    is_frozen = getattr(sys, "frozen", False)
    uvicorn.run(
        "app.server:app" if not is_frozen else app.server.app,
        host="127.0.0.1",
        port=port,
        log_level="info",
        reload=not is_frozen,
    )
