"""Performance and Diagnostic endpoints for IDE health telemetry."""

from fastapi import APIRouter
import time
import psutil
import os

router = APIRouter()

start_time = time.time()

@router.get("/status")
async def perf_status():
    """Returns real-time hardware telemetry and backend uptime."""
    process = psutil.Process(os.getpid())
    return {
        "status": "online",
        "uptime_seconds": round(time.time() - start_time, 2),
        "cpu_usage_percent": psutil.cpu_percent(interval=None),
        "memory_mb": round(process.memory_info().rss / (1024 * 1024), 2),
        "thread_count": process.num_threads()
    }

import json

@router.get("/temporal_file")
async def get_temporal_file(file_path: str):
    """Retrieve Temporal Lens profiling data for a file."""
    try:
        current_dir = os.path.dirname(os.path.abspath(file_path))
        aeres_dir = None
        while current_dir:
            potential_dir = os.path.join(current_dir, ".aeres")
            if os.path.exists(potential_dir) and os.path.isdir(potential_dir):
                aeres_dir = potential_dir
                break
            parent = os.path.dirname(current_dir)
            if parent == current_dir:
                break
            current_dir = parent
            
        if not aeres_dir:
            return []
            
        json_path = os.path.join(aeres_dir, "temporal_lens.json")
        if not os.path.exists(json_path):
            return []
            
        with open(json_path, "r") as f:
            data = json.load(f)
            
        target_path = os.path.abspath(file_path)
        if os.name == 'nt':
            for k in data.keys():
                if k.lower() == target_path.lower():
                    return data[k]
        
        return data.get(target_path, [])
    except Exception as e:
        return []
