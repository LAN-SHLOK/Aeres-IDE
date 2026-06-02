from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
import sys
import threading
import json
import time

router = APIRouter()

class LaunchRequest(BaseModel):
    path: str
    args: list[str] = []

# Super lightweight mock debugger state
DEBUG_STATE = {
    "status": "idle",
    "variables": {"locals": [], "watch": []},
    "callStack": [],
    "output": []
}

def simulate_debugger(path: str):
    DEBUG_STATE["status"] = "running"
    DEBUG_STATE["output"].append(f"Debugger attached to {path}")
    
    # Simulate stopping at a breakpoint after 1 second
    time.sleep(1.0)
    DEBUG_STATE["status"] = "paused"
    DEBUG_STATE["callStack"] = [
        {"id": 1, "name": "main()", "file": path, "line": 10},
        {"id": 2, "name": "<module>", "file": path, "line": 1}
    ]
    DEBUG_STATE["variables"]["locals"] = [
        {"name": "x", "value": "42", "type": "int"},
        {"name": "user_id", "value": "'shlok'", "type": "str"},
        {"name": "items", "value": "[1, 2, 3]", "type": "list"}
    ]
    DEBUG_STATE["output"].append(f"Hit breakpoint in {path} at line 10")
    
    # Stay paused for 5 seconds to let the frontend poll it, then finish
    time.sleep(5.0)
    DEBUG_STATE["status"] = "idle"
    DEBUG_STATE["callStack"] = []
    DEBUG_STATE["variables"]["locals"] = []
    DEBUG_STATE["output"].append("Process exited with code 0")


@router.post("/launch")
async def launch_debug(req: LaunchRequest, background_tasks: BackgroundTasks):
    DEBUG_STATE["status"] = "starting"
    DEBUG_STATE["output"] = []
    background_tasks.add_task(simulate_debugger, req.path)
    return {"status": "started"}

@router.get("/state")
async def get_state():
    return DEBUG_STATE

@router.post("/stop")
async def stop_debug():
    DEBUG_STATE["status"] = "idle"
    DEBUG_STATE["callStack"] = []
    DEBUG_STATE["variables"]["locals"] = []
    return {"status": "stopped"}

@router.post("/continue")
async def continue_debug():
    if DEBUG_STATE["status"] == "paused":
        DEBUG_STATE["status"] = "running"
        DEBUG_STATE["callStack"] = []
        DEBUG_STATE["variables"]["locals"] = []
        DEBUG_STATE["output"].append("Continuing execution...")
    return {"status": DEBUG_STATE["status"]}
