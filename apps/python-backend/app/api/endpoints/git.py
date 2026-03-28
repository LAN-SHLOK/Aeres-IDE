"""Git status endpoint."""

from __future__ import annotations

import asyncio
import shlex

from fastapi import APIRouter, Depends, Query

from app.core.security import get_current_user

router = APIRouter()


async def _run_git(args: str, cwd: str) -> str:
    """Run a git command and return stdout."""
    cmd = f"git -C {shlex.quote(cwd)} {args}"
    proc = await asyncio.create_subprocess_shell(
        cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    return stdout.decode("utf-8", errors="replace")


@router.get("/status")
async def git_status(path: str = Query(...), user: dict = Depends(get_current_user)):
    """Get git status for a repository path."""
    output = await _run_git("status --porcelain --branch", path)
    lines = output.strip().splitlines()

    branch = "unknown"
    files = []

    for line in lines:
        if line.startswith("## "):
            branch_part = line[3:]
            if "..." in branch_part:
                branch = branch_part.split("...")[0]
            else:
                branch = branch_part.strip()
        elif len(line) >= 3:
            x = line[0]
            y = line[1]
            file_path = line[3:]
            # Handle renames: "R  old -> new"
            if " -> " in file_path:
                file_path = file_path.split(" -> ")[-1]
            files.append({"x": x, "y": y, "path": file_path.strip()})

    return {"branch": branch, "files": files}
