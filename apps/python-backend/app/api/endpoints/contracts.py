from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.core.models import ObservationRequest, GenerateTestsRequest
from app.agents.contract_observer import record_observation, generate_snapshot_tests, observations

router = APIRouter()

@router.post("/observe")
async def record(body: ObservationRequest, user: dict = Depends(get_current_user)):
    """Record a function I/O observation from a debug/run session."""
    record_observation(body.file_path, body.function_name, body.inputs, body.output, body.error)
    key = f"{body.file_path}:{body.function_name}"
    obs_count = len(observations.get(key, []))
    # Suggest test generation after 5 unique observations
    return {"count": obs_count, "suggestGenerate": obs_count >= 5 and obs_count % 5 == 0}

@router.post("/generate")
async def generate(body: GenerateTestsRequest, user: dict = Depends(get_current_user)):
    """Generate professional test code based on current observations."""
    tests = generate_snapshot_tests(body.file_path, body.function_name, body.language)
    return {"tests": tests, "language": body.language}

@router.get("/summary")
async def get_summary(file_path: str, user: dict = Depends(get_current_user)):
    """Get a summary of all observations for the current file."""
    summary = []
    for key, obs in observations.items():
        if key.startswith(file_path):
            fn = key.split(':')[1]
            summary.append({
                "function": fn, 
                "callCount": len(obs), 
                "edgeCases": sum(1 for o in obs if o['isEdgeCase'])
            })
    return summary

@router.get("/status")
async def get_status():
    return {"status": "active", "feature": "contract_snapshot_tests"}
