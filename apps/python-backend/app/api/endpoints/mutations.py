from fastapi import APIRouter, Depends, BackgroundTasks
from app.core.security import get_current_user
from app.core.models import MutationRunRequest
from app.agents.mutation_engine import run_mutation_testing
import asyncio, threading

router = APIRouter()
import hashlib
import threading

_jobs_state = {}
_jobs_lock = threading.Lock()

def get_job_path(file_path: str) -> str:
    return hashlib.md5(file_path.encode()).hexdigest()

def read_job_state(file_path: str):
    job_id = get_job_path(file_path)
    with _jobs_lock:
        return _jobs_state.get(job_id, {"isRunning": False, "results": []}).copy()

def write_job_state(file_path: str, state: dict):
    job_id = get_job_path(file_path)
    with _jobs_lock:
        _jobs_state[job_id] = state

@router.post("/run")
async def run_mutations(body: MutationRunRequest, background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    """Initiate a background mutation run for a specific file."""
    state = read_job_state(body.file_path)
    if state.get("isRunning"):
        return {"status": "already_running"}
    
    def run_in_thread():
        write_job_state(body.file_path, {"isRunning": True, "results": [], "tested": 0})
        try:
            results, tested = run_mutation_testing(
                file_path=body.file_path,
                source=body.source,
                test_command=body.test_command,
                repo_path=body.repo_path,
                max_mutations=body.max_mutations or 20,
                skip_baseline=False
            )
            write_job_state(body.file_path, {"isRunning": False, "results": results, "tested": tested})
        except Exception as e:
            write_job_state(body.file_path, {"isRunning": False, "results": [], "tested": 0, "error": str(e)})
    
    # Run in background daemon thread for silent operation
    thread = threading.Thread(target=run_in_thread, daemon=True)
    thread.start()
    return {"status": "started", "filePath": body.file_path}

@router.get("/results")
async def get_results(file_path: str, user: dict = Depends(get_current_user)):
    """Retrieve the latest mutation quality results for a file."""
    return read_job_state(file_path)

@router.get("/status")
async def get_status():
    return {"status": "active", "feature": "silent_mutation_tester"}
