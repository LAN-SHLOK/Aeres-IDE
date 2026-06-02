from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json

from app.core.jupyter_manager import jupyter_manager

router = APIRouter()

class JupyterExecuteRequest(BaseModel):
    session_id: str
    code: str

@router.post("/execute")
async def execute_cell(req: JupyterExecuteRequest):
    """Execute a code cell and stream the result using SSE."""
    
    async def event_stream():
        try:
            async for output in jupyter_manager.execute_code(req.session_id, req.code):
                yield f"data: {json.dumps(output)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'ename': 'Exception', 'evalue': str(e), 'traceback': []})}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )

class JupyterStopRequest(BaseModel):
    session_id: str

@router.post("/stop")
async def stop_kernel(req: JupyterStopRequest):
    """Stop the kernel for the given session."""
    await jupyter_manager.stop_kernel(req.session_id)
    return {"status": "stopped"}
