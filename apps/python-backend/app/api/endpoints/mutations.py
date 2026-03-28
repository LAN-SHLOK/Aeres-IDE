from fastapi import APIRouter, Depends, BackgroundTasks
from app.core.security import get_current_user
from app.core.models import MutationRunRequest
from app.agents.mutation_engine import run_mutation_testing
import asyncio, threading

router = APIRouter()
mutation_results: dict = {}  # file_path → [survived mutations]
running_jobs: set = set()

@router.post("/run")
async def run_mutations(body: MutationRunRequest, background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    """Initiate a background mutation run for a specific file."""
    if body.file_path in running_jobs:
        return {"status": "already_running"}
    
    def run_in_thread():
        running_jobs.add(body.file_path)
        try:
            results = run_mutation_testing(
                file_path=body.file_path,
                source=body.source,
                test_command=body.test_command,
                repo_path=body.repo_path,
                max_mutations=body.max_mutations or 20,
            )
            mutation_results[body.file_path] = results
        finally:
            running_jobs.discard(body.file_path)
    
    # Run in background daemon thread for silent operation
    thread = threading.Thread(target=run_in_thread, daemon=True)
    thread.start()
    return {"status": "started", "filePath": body.file_path}

@router.get("/results")
async def get_results(file_path: str, user: dict = Depends(get_current_user)):
    """Retrieve the latest mutation quality results for a file."""
    return {
        "results": mutation_results.get(file_path, []),
        "isRunning": file_path in running_jobs,
    }

@router.get("/status")
async def get_status():
    return {"status": "active", "feature": "silent_mutation_tester"}
