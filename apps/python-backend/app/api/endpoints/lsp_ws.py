from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import asyncio
import os
import subprocess

try:
    import jedi
    JEDI_AVAILABLE = True
except ImportError:
    JEDI_AVAILABLE = False

router = APIRouter()

class LSPClient:
    def __init__(self, cmd: str):
        self.cmd = cmd
        self.proc = None
        self.req_id = 1
        self.pending = {}
        self.initialized = False
        
    async def start(self):
        if self.proc is not None:
            return
        
        import threading
        self.proc = subprocess.Popen(
            self.cmd,
            shell=True,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
        )
        
        threading.Thread(target=self._read_thread, daemon=True).start()
        
        await self.send_request("initialize", {
            "processId": os.getpid(),
            "rootUri": None,
            "capabilities": {}
        })
        self.initialized = True
        
    def _read_thread(self):
        while True:
            try:
                headers = {}
                while True:
                    line = self.proc.stdout.readline().decode('utf-8')
                    if not line or line == '\r\n':
                        break
                    key, value = line.split(':', 1)
                    headers[key.strip()] = value.strip()
                
                if "Content-Length" not in headers:
                    break
                
                content_length = int(headers["Content-Length"])
                body = self.proc.stdout.read(content_length)
                msg = json.loads(body.decode('utf-8'))
                
                if "id" in msg and msg["id"] in self.pending:
                    fut, loop = self.pending.pop(msg["id"])
                    loop.call_soon_threadsafe(fut.set_result, msg)
            except Exception:
                break
                
    async def send_request(self, method, params):
        req_id = self.req_id
        self.req_id += 1
        msg = {
            "jsonrpc": "2.0",
            "id": req_id,
            "method": method,
            "params": params
        }
        loop = asyncio.get_running_loop()
        fut = loop.create_future()
        self.pending[req_id] = (fut, loop)
        
        body = json.dumps(msg).encode('utf-8')
        header = f"Content-Length: {len(body)}\r\n\r\n".encode('utf-8')
        self.proc.stdin.write(header + body)
        self.proc.stdin.flush()
        
        return await fut
        
    async def send_notification(self, method, params):
        if not self.proc: return
        msg = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params
        }
        body = json.dumps(msg).encode('utf-8')
        header = f"Content-Length: {len(body)}\r\n\r\n".encode('utf-8')
        self.proc.stdin.write(header + body)
        self.proc.stdin.flush()

# Global LSP instances mapped by command
lsp_clients = {}

async def get_lsp_client(file_path: str):
    cmd = None
    if file_path.endswith((".js", ".jsx", ".ts", ".tsx")):
        cmd = "npx.cmd --yes typescript-language-server --stdio" if os.name == 'nt' else "npx --yes typescript-language-server --stdio"
    elif file_path.endswith(".go"):
        cmd = "gopls"
    elif file_path.endswith(".rs"):
        cmd = "rust-analyzer"
    elif file_path.endswith((".c", ".cpp", ".cc", ".h", ".hpp")):
        cmd = "clangd"
    
    # Custom LSP fallback via .aeres/lsp.json
    if not cmd:
        workspace_dir = os.path.dirname(file_path)
        while workspace_dir and workspace_dir != os.path.dirname(workspace_dir):
            lsp_config = os.path.join(workspace_dir, ".aeres", "lsp.json")
            if os.path.exists(lsp_config):
                try:
                    with open(lsp_config, 'r') as f:
                        config = json.load(f)
                        ext = "." + file_path.split(".")[-1]
                        if ext in config:
                            cmd = config[ext]
                except: pass
                break
            workspace_dir = os.path.dirname(workspace_dir)

    if not cmd:
        return None
        
    if cmd not in lsp_clients:
        client = LSPClient(cmd)
        lsp_clients[cmd] = client
        try:
            await client.start()
        except Exception as e:
            print(f"Failed to start LSP {cmd}: {e}")
            return None
            
    return lsp_clients[cmd]

@router.on_event("startup")
async def startup_event():
    # We will spawn LSPs lazily when files are opened
    pass

@router.websocket("/ws")
async def lsp_websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            
            req_type = msg.get("type")
            req_id = msg.get("id")
            file_path = msg.get("path", "")
            content = msg.get("content", "")
            line = msg.get("line", 1)
            column = msg.get("column", 1)
            
            # Map paths to URIs for LSP
            file_uri = f"file:///{file_path.replace(os.sep, '/')}"
            
            if req_type == "completion":
                completions = []
                
                # Use Jedi for Python files if available
                if file_path.endswith(".py") and JEDI_AVAILABLE:
                    try:
                        script = jedi.Script(code=content, path=file_path)
                        jedi_completions = script.complete(line, max(0, column - 1))
                        for c in jedi_completions:
                            completions.append({
                                "label": c.name,
                                "kind": c.type,
                                "detail": c.description,
                                "insertText": c.name
                            })
                    except Exception as e:
                        print(f"Jedi Error: {e}")
                
                else:
                    client = await get_lsp_client(file_path)
                    if client and client.proc:
                        try:
                            # Sync document state
                            lang_id = file_path.split(".")[-1]
                            if lang_id in ("js", "jsx"): lang_id = "javascript"
                            elif lang_id in ("ts", "tsx"): lang_id = "typescript"
                            
                            await client.send_notification("textDocument/didOpen", {
                                "textDocument": {
                                    "uri": file_uri,
                                    "languageId": lang_id,
                                    "version": 1,
                                    "text": content
                                }
                            })
                            # Request completions
                            res = await asyncio.wait_for(client.send_request("textDocument/completion", {
                                "textDocument": {"uri": file_uri},
                                "position": {"line": line - 1, "character": column - 1}
                            }), timeout=2.0)
                            
                            items = res.get("result", [])
                            if isinstance(items, dict) and "items" in items:
                                items = items["items"]
                                
                            for item in items[:50]: # Limit to 50 for performance
                                kind_val = item.get("kind", 1)
                                kind_str = "function" if kind_val in (2, 3) else "variable"
                                completions.append({
                                    "label": item.get("label"),
                                    "kind": kind_str,
                                    "detail": item.get("detail", ""),
                                    "insertText": item.get("insertText") or item.get("label")
                                })
                        except Exception as e:
                            print(f"LSP Error: {e}")
                
                await websocket.send_text(json.dumps({
                    "type": "completion_result",
                    "id": req_id,
                    "completions": completions
                }))
                
            elif req_type == "hover":
                hover_text = ""
                if file_path.endswith(".py") and JEDI_AVAILABLE:
                    try:
                        script = jedi.Script(code=content, path=file_path)
                        hover_res = script.infer(line, max(0, column - 1))
                        if hover_res:
                            hover_text = hover_res[0].description
                    except Exception:
                        pass
                
                else:
                    client = await get_lsp_client(file_path)
                    if client and client.proc:
                        try:
                            res = await asyncio.wait_for(client.send_request("textDocument/hover", {
                                "textDocument": {"uri": file_uri},
                                "position": {"line": line - 1, "character": column - 1}
                            }), timeout=2.0)
                            
                            hover_obj = res.get("result")
                            if hover_obj and "contents" in hover_obj:
                                contents = hover_obj["contents"]
                                if isinstance(contents, dict) and "value" in contents:
                                    hover_text = contents["value"]
                                elif isinstance(contents, str):
                                    hover_text = contents
                                elif isinstance(contents, list):
                                    hover_text = "\n".join([c.get("value", "") if isinstance(c, dict) else c for c in contents])
                        except Exception as e:
                            pass
                
                await websocket.send_text(json.dumps({
                    "type": "hover_result",
                    "id": req_id,
                    "hover": hover_text
                }))
                
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"LSP WS Error: {e}")
