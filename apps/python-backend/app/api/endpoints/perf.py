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
