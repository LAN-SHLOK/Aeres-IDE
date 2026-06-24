import os
import shutil
import subprocess
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict

from app.core.security import get_current_user
from app.rag_engine.ast_parser import parse_python_file, parse_js_file, parse_generic_file
from app.rag_engine.vector_db import store_catalyst_nodes
from app.core.config import settings, user_data_dir

router = APIRouter()

class IngestRepoRequest(BaseModel):
    github_url: str

@router.post("/ingest-repo")
async def ingest_repository(req: IngestRepoRequest, user: dict = Depends(get_current_user)):
    """
    Clones a GitHub repository, parses ASTs and generic files, and stores structural nodes.
    Also saves a map of the complete folder structure.
    """
    repo_name = req.github_url.split('/')[-1].replace(".git", "")
    if "github.com" not in req.github_url:
        repo_name = req.github_url.replace("https://", "").replace("http://", "").replace("/", "_")
        
    base_dir = os.path.join(user_data_dir, "catalyst_repos")
    os.makedirs(base_dir, exist_ok=True)
    repo_path = os.path.join(base_dir, repo_name)
    
    if "github.com" not in req.github_url:
        import httpx
        from bs4 import BeautifulSoup
        try:
            async with httpx.AsyncClient() as client:
                r = await client.get(req.github_url, timeout=15)
                soup = BeautifulSoup(r.text, 'html.parser')
                text = soup.get_text(separator='\n', strip=True)
                
            os.makedirs(repo_path, exist_ok=True)
            with open(os.path.join(repo_path, "index.html"), "w", encoding="utf-8") as f:
                f.write(r.text)
            
            with open(os.path.join(base_dir, f"{repo_name}_tree.txt"), "w", encoding="utf-8") as f:
                f.write(f"[{repo_name}]\n|-- index.html (Website Content)")
                
            all_nodes = [{
                "id": "website_content",
                "name": req.github_url,
                "type": "website",
                "file_path": "index.html",
                "code_snippet": text[:15000]
            }]
            store_catalyst_nodes(all_nodes, repo_name)
            return {
                "status": "success",
                "message": f"Successfully scraped website {req.github_url}.",
                "nodes_extracted": 1
            }
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to scrape website: {str(e)}")

    # Fallback to HTTP Zip Download for actual repos to avoid requiring git installed
    import httpx
    import zipfile
    import io
    
    parts = req.github_url.rstrip("/").split("/")
    if len(parts) >= 2:
        owner, repo = parts[-2], parts[-1].replace(".git", "")
        zip_url = f"https://api.github.com/repos/{owner}/{repo}/zipball"
        
        if os.path.exists(repo_path):
            shutil.rmtree(repo_path)
        os.makedirs(repo_path, exist_ok=True)
        
        try:
            async with httpx.AsyncClient(follow_redirects=True) as client:
                resp = await client.get(zip_url, timeout=30)
                resp.raise_for_status()
                
                with zipfile.ZipFile(io.BytesIO(resp.content)) as z:
                    for file_info in z.infolist():
                        if not file_info.filename.endswith('/'):
                            # Strip the first directory (e.g. owner-repo-1234abc/) from filename
                            filename_parts = file_info.filename.split('/', 1)
                            if len(filename_parts) == 2:
                                dest_path = os.path.join(repo_path, filename_parts[1])
                                os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                                with z.open(file_info) as source, open(dest_path, "wb") as target:
                                    shutil.copyfileobj(source, target)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to download repository. Ensure it is public: {str(e)}")

    # 2. Walk and Parse ASTs
    all_nodes = []
    tree_lines = [f"[{repo_name}]"]
    valid_generic_exts = {
        # Web & Config
        '.css', '.html', '.json', '.md', '.yml', '.yaml', '.toml', '.xml', '.graphql', '.gql', '.vue', '.svelte',
        # Backend & Systems
        '.go', '.rs', '.java', '.c', '.h', '.cpp', '.hpp', '.cs', '.rb', '.php', '.sql', '.sh', '.bash',
        # Mobile & Other
        '.swift', '.kt', '.dart', '.lua', '.r', '.m', '.scala', '.groovy'
    }
    
    for root, dirs, files in os.walk(repo_path):
        # Ignore hidden dirs and massive node_modules
        dirs[:] = [d for d in dirs if not d.startswith('.') and d != "node_modules" and d != "venv"]
        
        rel_root = os.path.relpath(root, repo_path)
        if rel_root != ".":
            depth = rel_root.count(os.sep)
            tree_lines.append("  " * depth + f"/{os.path.basename(root)}")
            
        for f in files:
            depth = rel_root.count(os.sep) + (0 if rel_root == "." else 1)
            tree_lines.append("  " * depth + f"- {f}")
            
            file_path = os.path.join(root, f)
            rel_path = os.path.relpath(file_path, repo_path)
            try:
                if f.endswith('.py'):
                    with open(file_path, "r", encoding="utf-8") as file:
                        source = file.read()
                    nodes = parse_python_file(source, rel_path)
                    all_nodes.extend(nodes)
                elif f.endswith(('.js', '.jsx', '.ts', '.tsx')):
                    with open(file_path, "r", encoding="utf-8") as file:
                        source = file.read()
                    nodes = parse_js_file(source, rel_path)
                    all_nodes.extend(nodes)
                elif f.endswith(tuple(valid_generic_exts)):
                    with open(file_path, "r", encoding="utf-8") as file:
                        source = file.read()
                    nodes = parse_generic_file(source, rel_path)
                    all_nodes.extend(nodes)
            except Exception as e:
                print(f"[Catalyst] Error parsing {file_path}: {e}")

    # Save the tree structure to a file
    tree_text = "\n".join(tree_lines)
    tree_file_path = os.path.join(base_dir, f"{repo_name}_tree.txt")
    with open(tree_file_path, "w", encoding="utf-8") as f:
        f.write(tree_text)

    # 3. Store in Vector DB
    if all_nodes:
        store_catalyst_nodes(all_nodes, repo_name)
    
    return {
        "status": "success",
        "message": f"Successfully ingested {repo_name}.",
        "nodes_extracted": len(all_nodes)
    }

class QueryIssueRequest(BaseModel):
    repo_name: str
    issue_text: str

@router.post("/query-issue")
async def query_issue(req: QueryIssueRequest, request: dict = Depends(get_current_user)):
    """
    RAG Agent specially designed to act as an architectural guide for an open source issue.
    """
    from app.rag_engine.vector_db import query_catalyst_nodes
    from app.rag_engine.groq_gateway import groq_complete
    
    # Read the full tree structure
    base_dir = os.path.join(user_data_dir, "catalyst_repos")
    tree_file_path = os.path.join(base_dir, f"{req.repo_name}_tree.txt")
    tree_context = ""
    if os.path.exists(tree_file_path):
        with open(tree_file_path, "r", encoding="utf-8") as f:
            tree_context = f.read()

    # Semantic search over AST nodes
    rag_results = query_catalyst_nodes(req.issue_text, req.repo_name, n_results=10)
    
    context_blocks = []
    for r in rag_results:
        # Build structured context of the architectural layout
        context_blocks.append(
            f"FILE: {r['file_path']}\n"
            f"TYPE: {r['type'].upper()} ({r['name']})\n"
            f"SNIPPET:\n```python\n{r['code_snippet']}\n```"
        )
    
    context_str = "\n\n".join(context_blocks)
    
    system_prompt = (
        "You are the Open-Source Codebase Catalyst, an elite architectural guide for developers. "
        "Your goal is to help a developer implement a fix for the provided GitHub Issue. "
        "Do NOT write all the code for them. Instead, act as a Staff Engineer guiding a new contributor:\n"
        "1. Identify the core components or logic files that need modification.\n"
        "2. Explain *why* those files are relevant based on the AST context provided.\n"
        "3. Provide a step-by-step architectural plan on where to make changes.\n"
        "4. Be technical, structured, and extremely precise with file paths and function names.\n"
        "5. If summarizing the architecture or tech stack (like databases or gateways), INFER details from the [FULL REPOSITORY FOLDER STRUCTURE] (e.g. infer PostgreSQL if 'prisma/' or 'migrations/' is present, or Stripe if 'stripe' files exist), rather than saying 'not specified in provided code'.\n"
        "6. If generating Mermaid charts, STRICTLY use standard syntax. Example: NodeA -->|Label text| NodeB. NEVER append an extra '>' after the label like `-->|Label|>`. This breaks the parser."
    )
    
    user_prompt = f"TARGET REPOSITORY: {req.repo_name}\n\n[FULL REPOSITORY FOLDER STRUCTURE]:\n{tree_context}\n\n[ARCHITECTURAL CONTEXT FROM AST PARSER]:\n{context_str}\n\n[GITHUB ISSUE / GOAL]:\n{req.issue_text}"
    
    try:
        # Note: If api_key is passed via headers, we might need to extract it from a Request object.
        # But groq_complete falls back to env GROQ_API_KEY if not passed.
        answer = await groq_complete(system_prompt, user_prompt, max_tokens=2500, temperature=0.2)
        return {"answer": answer, "nodes_referenced": len(rag_results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/diagram-blueprint")
async def diagram_blueprint(req: QueryIssueRequest, request: dict = Depends(get_current_user)):
    from app.rag_engine import vector_db
    from app.rag_engine.groq_gateway import groq_complete
    
    repo_name = req.repo_name
    
    rag_results = vector_db.query_catalyst_nodes(req.issue_text, repo_name, n_results=10)
    
    context_chunks = []
    if rag_results:
        for r in rag_results:
            context_chunks.append(f"File: {r.get('file_path', 'Unknown')}\nType: {r.get('type', 'Unknown')}\nName: {r.get('name', 'Unknown')}\nContent:\n{r.get('document', '')}")
            
    # Also grab the _tree.txt
    tree_context = ""
    base_dir = os.path.join(user_data_dir, "catalyst_repos")
    tree_path = os.path.join(base_dir, f"{repo_name}_tree.txt")
    if os.path.exists(tree_path):
        with open(tree_path, "r", encoding="utf-8") as f:
            tree_context = f.read()

    system_prompt = """ROLE
You are the "Direct Repo Cartographer," an advanced architectural mapping AI. Your sole purpose is to analyze a GitHub repository via its direct link, parse its file structure and contents, match it against a user's natural language description, and plan a highly accurate, beautiful structural workflow diagram.

STRICT DIRECTIVE: NO CODE GENERATION
Do not write, refactor, or output any executable code snippets. Your output must strictly be a Mermaid flowchart defining architectural relationships, execution pathways, and file dependencies.

INPUTS PROVIDED TO YOU
[Codebase Contents]: The fetched file tree, repository architecture, and contents of core files from the link.
[User Description]: The freeform description of what the user wants to understand, explore, or build.

BEHAVIOR & CORRELATION ENGINE
1. Locate Core Files: Trace the repository structure provided in the context to find where the action happens. 
2. Trace the Path: Follow the import/export statements, API hooks, or function references across the fetched files to establish a logical connection path that addresses the user's description.
3. Draft the Blueprint: Organize the files and modules into a clean, sequential flow of data or execution.

OUTPUT REQUIREMENTS
Generate a clean, structured Mermaid flowchart (flowchart TD). Wrap it in a markdown ```mermaid block.
Use subgraphs to group related modules or frontend/backend boundaries.
CRITICAL: When labeling an arrow, use STRICT syntax: NodeA -->|Label| NodeB. NEVER append an extra '>' after the label (e.g. `-->|Label|>`).
Example:
```mermaid
flowchart TD
  User --> Frontend
  subgraph Client
    Frontend[React UI]
  end
  subgraph Server
    Frontend -->|API| Backend[FastAPI]
  end
```
"""
    
    user_prompt = f"""
[User Description]:
{req.issue_text}

[Repository Folder Structure]:
{tree_context[:10000]}

[Codebase Contents (RAG Matches)]:
{chr(10).join(context_chunks)}
"""
    try:
        diagram_api_key = os.environ.get("IDE_DIAGRAM_ENGINE") or settings.IDE_DIAGRAM_ENGINE or settings.GROQ_API_KEY
        answer = await groq_complete(system_prompt, user_prompt, max_tokens=1500, temperature=0.1, api_key=diagram_api_key)
        
        # Extract Mermaid
        diagram_data = ""
        import re
        match = re.search(r"```mermaid\n(.*?)\n```", answer, re.DOTALL)
        if match:
            diagram_data = match.group(1).strip()
        else:
            diagram_data = answer.strip()
                
        return {"diagram_data": diagram_data, "raw_response": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

