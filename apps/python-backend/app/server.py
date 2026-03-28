from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
)


def create_app() -> FastAPI:
    # Chroma and the embedding model load lazily on first RAG use so /api/health
    # and the Electron sidecar health check can succeed immediately.
    application = FastAPI(
        title="Aether IDE Backend",
        version="1.0.0",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
            "aether://",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @application.get("/api/health")
    async def health():
        return {"status": "ok", "version": "1.0.0"}

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

    return application


app = create_app()
