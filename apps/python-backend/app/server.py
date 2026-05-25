from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import json
import asyncio

from app.api.endpoints import (
    ai,
    analyze,
    contracts,
    deps,
    git,
    git_extra,
    mutations,
    perf,
    rag,
    rag_ingest,
    search,
    settings,
)
from app.core.file_watcher import file_watcher


def create_app() -> FastAPI:
    application = FastAPI(
        title="Aeres IDE Backend",
        version="1.0.0",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @application.get("/api/health")
    async def health():
        return {"status": "ok", "version": "1.0.0"}

    @application.get("/")
    async def root():
        return {"name": "Aeres IDE Backend API", "status": "running"}

    @application.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket):
        await websocket.accept()
        
        async def file_callback(event_type, path):
            try:
                await websocket.send_text(json.dumps({
                    "type": "fs_event",
                    "event": event_type,
                    "path": path
                }))
            except:
                pass

        # Simple way to start watcher when client connects and tells us the path
        try:
            while True:
                data = await websocket.receive_text()
                msg = json.loads(data)
                if msg.get("type") == "watch":
                    path = msg.get("path")
                    if path:
                        file_watcher.start(path, lambda et, p: asyncio.run_coroutine_threadsafe(file_callback(et, p), asyncio.get_event_loop()))
        except WebSocketDisconnect:
            file_watcher.stop()

    application.include_router(analyze.router, prefix="/api/analyze", tags=["analyze"])
    application.include_router(rag.router, prefix="/api/rag", tags=["rag"])
    application.include_router(git.router, prefix="/api/git", tags=["git"])
    application.include_router(git_extra.router, prefix="/api/git", tags=["git-extra"])
    application.include_router(ai.router, prefix="/api/ai", tags=["ai"])
    application.include_router(perf.router, prefix="/api/perf", tags=["perf"])
    application.include_router(contracts.router, prefix="/api/contracts", tags=["contracts"])
    application.include_router(deps.router, prefix="/api/deps", tags=["deps"])
    application.include_router(mutations.router, prefix="/api/mutations", tags=["mutations"])
    application.include_router(search.router, prefix="/api/search", tags=["search"])
    application.include_router(rag_ingest.router, prefix="/api/rag", tags=["rag"])
    application.include_router(settings.router, prefix="/api/settings", tags=["settings"])

    return application


app = create_app()
