import subprocess, ast, json, re
from pathlib import Path
from typing import List, Dict, Optional

def git(args: str, cwd: str) -> str:
    try:
        result = subprocess.run(f"git {args}", shell=True, cwd=cwd, capture_output=True, text=True)
        return result.stdout.strip()
    except Exception:
        return ""

def get_function_commits(repo_path: str, file_path: str, function_name: str, limit: int = 30) -> List[Dict]:
    """Get all commits that touched a specific function in a file."""
    # Use git log -L to trace function changes
    raw = git(f'log -L :{function_name}:{file_path} --format="%H|||%an|||%ae|||%at|||%s" -{limit}', repo_path)
    if not raw:
        # Fallback to general file history if -L fails
        raw = git(f'log --format="%H|||%an|||%ae|||%at|||%s" -{limit} -- {file_path}', repo_path)
        
    commits = []
    for line in raw.split('\n'):
        if '|||' in line:
            parts = line.split('|||', 4)
            if len(parts) < 5: continue
            h, author, email, ts, subject = parts
            commits.append({'hash': h[:7], 'full_hash': h, 'author': author, 'email': email,
                          'timestamp': int(ts) * 1000, 'subject': subject})
    return commits

def get_ast_changes(repo_path: str, commit_hash: str, file_path: str) -> List[str]:
    """Extract what AST-level structures changed in this commit for this file."""
    diff = git(f'show {commit_hash} -- {file_path}', repo_path)
    if not diff: return ["logic modified"]
    
    changes = []
    # Detect renames
    rename_pattern = re.compile(r'-\s*(def|const|let|var|function|class)\s+(\w+)')
    for m in rename_pattern.finditer(diff):
        add_pattern = re.compile(rf'\+\s*{m.group(1)}\s+(\w+)')
        add_match = add_pattern.search(diff)
        if add_match and add_match.group(1) != m.group(2):
            changes.append(f"renamed {m.group(1)} '{m.group(2)}' → '{add_match.group(1)}'")
            
    # Detect added/removed null checks
    if re.search(r'-.*if.*(?:None|null|undefined)', diff):
        changes.append("removed null/None guard")
    if re.search(r'\+.*if.*(?:None|null|undefined)', diff):
        changes.append("added null/None guard")
        
    # Detect import changes
    import_removed = re.findall(r'^-.*import\s+(\w+)', diff, re.MULTILINE)
    import_added = re.findall(r'^\+.*import\s+(\w+)', diff, re.MULTILINE)
    for imp in import_removed:
        if imp not in import_added:
            changes.append(f"removed import '{imp}'")
            
    if not changes:
        changes.append("logic modified")
    return list(set(changes))

def build_causal_chain(repo_path: str, file_path: str, function_name: str, error_message: str = "") -> Dict:
    """Build the full causal chain for a function's current broken state."""
    # Convert absolute path to relative if needed
    p = Path(file_path)
    if p.is_absolute():
        try:
            file_path = str(p.relative_to(repo_path))
        except ValueError:
            pass

    commits = get_function_commits(repo_path, file_path, function_name)
    if not commits:
        return {"nodes": [], "edges": [], "error": "No git history found for this function"}

    nodes = []
    edges = []
    # Add current error node
    nodes.append({
        "id": "error", 
        "type": "error", 
        "label": error_message or "Current state",
        "file": Path(file_path).name, 
        "timestamp": None
    })

    for i, commit in enumerate(commits[:8]):  # limit to 8 nodes for readability
        changes = get_ast_changes(repo_path, commit['full_hash'], file_path)
        node_id = commit['hash']
        
        # Heuristic for "isCausal": renames or removals are higher risk
        is_causal = any(any(k in c for k in ['renamed', 'removed', 'import']) for c in changes)
        
        nodes.append({
            "id": node_id, 
            "type": "commit",
            "label": commit['subject'][:60],
            "author": commit['author'],
            "hash": commit['hash'],
            "timestamp": commit['timestamp'],
            "changes": changes,
            "isCausal": is_causal
        })
        
        if i == 0:
            edges.append({"from": node_id, "to": "error", "label": "caused"})
        else:
            edges.append({"from": node_id, "to": commits[i-1]['hash'], "label": "led to"})

    return {
        "nodes": nodes, 
        "edges": edges, 
        "function": function_name, 
        "file": file_path
    }
