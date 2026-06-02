"""Git endpoints for the AERES-IDE backend."""

from __future__ import annotations

import asyncio
import shlex

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.core.security import get_current_user

router = APIRouter()


async def _run_git(args: str, cwd: str) -> str:
    """Run a git command and return stdout."""
    import subprocess
    import shlex
    import shutil
    import asyncio
    import os
    import sys

    parsed_args = shlex.split(args, posix=True)

    # Locate git executable — handles Windows PATH issues
    git_exe = shutil.which("git")
    if not git_exe:
        # Common Windows install paths
        for candidate in [
            r"C:\Program Files\Git\cmd\git.exe",
            r"C:\Program Files (x86)\Git\cmd\git.exe",
            os.path.expanduser(r"~\AppData\Local\Programs\Git\cmd\git.exe"),
        ]:
            if os.path.isfile(candidate):
                git_exe = candidate
                break
    if not git_exe:
        git_exe = "git"  # Last resort — let the OS try

    cmd = [git_exe] + parsed_args

    def sync_run():
        env = os.environ.copy()
        env["GIT_TERMINAL_PROMPT"] = "0"
        
        # Ensure common git paths are in PATH for credential helpers
        extra_paths = []
        if sys.platform == "win32":
            pf = os.environ.get("ProgramFiles", r"C:\Program Files")
            extra_paths.append(os.path.join(pf, "Git", "cmd"))
            extra_paths.append(os.path.join(pf, "Git", "bin"))
        if extra_paths:
            env["PATH"] = os.pathsep.join(extra_paths) + os.pathsep + env.get("PATH", "")

        return subprocess.run(
            cmd,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env,
        )

    loop = asyncio.get_event_loop()
    proc = await loop.run_in_executor(None, sync_run)
    
    out_str = proc.stdout.decode("utf-8", errors="replace")
    err_str = proc.stderr.decode("utf-8", errors="replace")
    
    if proc.returncode != 0:
        if not err_str:
            err_str = out_str
        raise RuntimeError(err_str.strip() or f"Git command failed with exit code {proc.returncode}")
        
    return out_str


# ── Pydantic Models ──────────────────────────────────────────────────────────

class GitPathRequest(BaseModel):
    path: str

class GitBranchRequest(BaseModel):
    path: str
    name: str
    checkout: bool = False

class GitStageRequest(BaseModel):
    path: str
    files: list[str] = []

class GitCommitRequest(BaseModel):
    path: str
    message: str

class GitPushRequest(BaseModel):
    path: str
    force: bool = False
    username: str | None = None
    token: str | None = None

class GitPullRequest(BaseModel):
    path: str
    username: str | None = None
    token: str | None = None

class GitDiscardRequest(BaseModel):
    path: str
    file: str


# ── GET Endpoints ─────────────────────────────────────────────────────────────

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


@router.get("/diff")
async def git_diff(path: str = Query(...), file: str = Query(""), user: dict = Depends(get_current_user)):
    args = f"diff HEAD -- {shlex.quote(file)}" if file else "diff HEAD"
    output = await _run_git(args, path)
    return {"diff": output}


@router.get("/branches")
async def git_branches(path: str = Query(...), user: dict = Depends(get_current_user)):
    output = await _run_git("branch -a", path)
    local = []
    remote = []
    current = ""
    for line in output.splitlines():
        if not line.strip(): continue
        is_current = line.startswith("*")
        name = line[2:].strip()
        if is_current:
            current = name
        if name.startswith("remotes/"):
            remote.append(name.replace("remotes/", ""))
        else:
            local.append(name)
    return {"local": local, "remote": remote, "current": current}


@router.get("/log")
async def git_log(path: str = Query(...), n: int = Query(30), user: dict = Depends(get_current_user)):
    output = await _run_git(f'log -n {n} --pretty=format:"%h|%s|%an|%ar"', path)
    logs = []
    for line in output.splitlines():
        parts = line.split("|", 3)
        if len(parts) == 4:
            logs.append({"hash": parts[0], "message": parts[1], "author": parts[2], "date": parts[3]})
    return {"log": logs}


# ── POST Endpoints ────────────────────────────────────────────────────────────

@router.post("/init")
async def git_init(body: GitPathRequest, user: dict = Depends(get_current_user)):
    try:
        await _run_git("init", body.path)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e) or repr(e)}


@router.post("/create_branch")
async def git_create_branch(body: GitBranchRequest, user: dict = Depends(get_current_user)):
    try:
        if body.checkout:
            await _run_git(f"checkout -b {shlex.quote(body.name)}", body.path)
        else:
            await _run_git(f"branch {shlex.quote(body.name)}", body.path)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e) or repr(e)}


@router.post("/switch_branch")
async def git_switch_branch(body: GitBranchRequest, user: dict = Depends(get_current_user)):
    try:
        await _run_git(f"checkout {shlex.quote(body.name)}", body.path)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e) or repr(e)}


@router.post("/stage")
async def git_stage(body: GitStageRequest, user: dict = Depends(get_current_user)):
    """Stage files for commit."""
    try:
        if body.files:
            for f in body.files:
                await _run_git(f"add {shlex.quote(f)}", body.path)
        else:
            await _run_git("add -A", body.path)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e) or repr(e)}


@router.post("/unstage")
async def git_unstage(body: GitStageRequest, user: dict = Depends(get_current_user)):
    """Unstage files."""
    try:
        if body.files:
            for f in body.files:
                await _run_git(f"reset HEAD -- {shlex.quote(f)}", body.path)
        else:
            await _run_git("reset HEAD", body.path)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e) or repr(e)}


@router.post("/commit")
async def git_commit(body: GitCommitRequest, user: dict = Depends(get_current_user)):
    """Commit staged changes."""
    try:
        msg = body.message.replace('"', '\\"')
        output = await _run_git(f'commit -m "{msg}"', body.path)
        return {"success": True, "output": output}
    except Exception as e:
        return {"success": False, "error": str(e) or repr(e)}


class GitRemoteRequest(BaseModel):
    path: str
    url: str

@router.post("/push")
async def git_push(body: GitPushRequest, user: dict = Depends(get_current_user)):
    """Push commits to remote."""
    try:
        force_flag = "--force" if body.force else ""
        if getattr(body, "username", None) and getattr(body, "token", None):
            cred_helper = f"-c credential.helper= -c credential.helper='!f() {{ echo \"username={body.username}\"; echo \"password={body.token}\"; }}; f'"
            output = await _run_git(f"{cred_helper} push {force_flag}", body.path)
        else:
            output = await _run_git(f"push {force_flag}", body.path)
        return {"success": True, "output": output}
    except Exception as e:
        err_str = str(e)
        if "No configured push destination" in err_str or "has no upstream branch" in err_str or "current branch" in err_str:
            try:
                # Try setting upstream automatically
                if getattr(body, "username", None) and getattr(body, "token", None):
                    cred_helper = f"-c credential.helper= -c credential.helper='!f() {{ echo \"username={body.username}\"; echo \"password={body.token}\"; }}; f'"
                    output = await _run_git(f"{cred_helper} push -u origin HEAD {force_flag}", body.path)
                else:
                    output = await _run_git(f"push -u origin HEAD {force_flag}", body.path)
                return {"success": True, "output": output}
            except Exception as e2:
                err_str2 = str(e2)
                if "No configured push destination" in err_str2 or "does not appear to be a git repository" in err_str2:
                    return {"success": False, "error": "NO_REMOTE"}
                return {"success": False, "error": err_str2 or repr(e2)}
        return {"success": False, "error": err_str or repr(e)}

@router.post("/add_remote")
async def git_add_remote(body: GitRemoteRequest, user: dict = Depends(get_current_user)):
    """Add a git remote."""
    try:
        await _run_git(f"remote add origin {shlex.quote(body.url)}", body.path)
        # Set upstream for main
        try:
            await _run_git("push --set-upstream origin main", body.path)
        except Exception:
            pass # Ignore if push fails here, maybe it's an empty repo or different branch
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e) or repr(e)}


@router.post("/pull")
async def git_pull(body: GitPullRequest, user: dict = Depends(get_current_user)):
    """Pull changes from remote."""
    try:
        if getattr(body, "username", None) and getattr(body, "token", None):
            cred_helper = f"-c credential.helper= -c credential.helper='!f() {{ echo \"username={body.username}\"; echo \"password={body.token}\"; }}; f'"
            output = await _run_git(f"{cred_helper} pull", body.path)
        else:
            output = await _run_git("pull", body.path)
        return {"success": True, "output": output}
    except Exception as e:
        return {"success": False, "error": str(e) or repr(e)}

@router.post("/fetch")
async def git_fetch(body: GitPullRequest, user: dict = Depends(get_current_user)):
    """Fetch changes from remote."""
    try:
        if getattr(body, "username", None) and getattr(body, "token", None):
            cred_helper = f"-c credential.helper= -c credential.helper='!f() {{ echo \"username={body.username}\"; echo \"password={body.token}\"; }}; f'"
            output = await _run_git(f"{cred_helper} fetch", body.path)
        else:
            output = await _run_git("fetch", body.path)
        return {"success": True, "output": output}
    except Exception as e:
        return {"success": False, "error": str(e) or repr(e)}


@router.post("/stash")
async def git_stash(body: GitPathRequest, user: dict = Depends(get_current_user)):
    """Stash current changes."""
    try:
        output = await _run_git("stash", body.path)
        return {"success": True, "output": output}
    except Exception as e:
        return {"success": False, "error": str(e) or repr(e)}


@router.post("/stash_pop")
async def git_stash_pop(body: GitPathRequest, user: dict = Depends(get_current_user)):
    """Pop stashed changes."""
    try:
        output = await _run_git("stash pop", body.path)
        return {"success": True, "output": output}
    except Exception as e:
        return {"success": False, "error": str(e) or repr(e)}


@router.post("/discard")
async def git_discard(body: GitDiscardRequest, user: dict = Depends(get_current_user)):
    """Discard unstaged changes for a file."""
    try:
        await _run_git(f"checkout -- {shlex.quote(body.file)}", body.path)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e) or repr(e)}

class GitConfigRequest(BaseModel):
    path: str
    name: str
    email: str

@router.post("/config")
async def git_config(body: GitConfigRequest, user: dict = Depends(get_current_user)):
    """Set local repository git config (name and email)."""
    try:
        await _run_git(f"config user.name {shlex.quote(body.name)}", body.path)
        await _run_git(f"config user.email {shlex.quote(body.email)}", body.path)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}
