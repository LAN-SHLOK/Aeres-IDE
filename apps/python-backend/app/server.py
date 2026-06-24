from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import json
import asyncio
import os
import sys

if os.name == 'nt':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from app.api.endpoints import (
    ai,
    analyze,
    contracts,
    catalyst,
    deps,
    git,
    git_extra,
    perf,
    rag,
    rag_ingest,
    search,
    settings,
    lsp,
    lsp_ws,
    debug_api,
    dap_ws,
    env,
    proxy,
)
from app.core.file_watcher import file_watcher
from app.scrapers.cron_scraper import start_cron_scraper

def create_app() -> FastAPI:
    application = FastAPI(
        title="Aeres IDE Backend",
        version="1.0.0",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )
    
    @application.on_event("startup")
    async def startup_event():
        start_cron_scraper()
        
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
    application.include_router(catalyst.router, prefix="/api/catalyst", tags=["catalyst"])
    application.include_router(deps.router, prefix="/api/deps", tags=["deps"])
    application.include_router(search.router, prefix="/api/search", tags=["search"])
    application.include_router(rag_ingest.router, prefix="/api/rag", tags=["rag"])
    application.include_router(settings.router, prefix="/api/settings", tags=["settings"])
    from app.api.endpoints import api_keys
    application.include_router(api_keys.router, prefix="/api/keys", tags=["api_keys"])
    application.include_router(lsp.router, prefix="/api/lsp", tags=["lsp"])
    application.include_router(lsp_ws.router, prefix="/api/lsp", tags=["lsp-ws"])
    application.include_router(debug_api.router, prefix="/api/debug", tags=["debug"])
    application.include_router(dap_ws.router, prefix="/api/debug/dap", tags=["dap-ws"])
    application.include_router(env.router, prefix="/api/env", tags=["env"])
    application.include_router(proxy.router, prefix="/api/proxy", tags=["proxy"])
    from app.api.endpoints import jupyter_endpoints
    application.include_router(jupyter_endpoints.router, prefix="/api/jupyter", tags=["jupyter"])
    from app.api.endpoints import db_viewer
    application.include_router(db_viewer.router, prefix="/api/db", tags=["db-viewer"])

    return application


app = create_app()
