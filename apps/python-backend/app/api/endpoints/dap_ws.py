from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import asyncio
import os
import threading
import subprocess

router = APIRouter()

class DAPProxy:
    def __init__(self, websocket: WebSocket):
        self.ws = websocket
        self.proc = None
        self.reader = None
        self.writer = None
        try:
            self.loop = asyncio.get_running_loop()
        except RuntimeError:
            self.loop = None

    async def launch(self, file_path: str):
        cmd = None
        if file_path.endswith(".py"):
            cmd = f"python -Xfrozen_modules=off -m debugpy --listen 127.0.0.1:5678 --wait-for-client \"{file_path}\""
        elif file_path.endswith((".js", ".ts", ".jsx", ".tsx")):
            cmd = f"node --inspect-brk=127.0.0.1:5678 \"{file_path}\""
        elif file_path.endswith(".go"):
            cmd = f"dlv debug --headless --listen=127.0.0.1:5678 --api-version=2 --accept-multiclient \"{file_path}\""
        elif file_path.endswith(".rb"):
            cmd = f"rdbg --open --host 127.0.0.1 --port 5678 -c -- ruby \"{file_path}\""
        elif file_path.endswith(".php"):
            cmd = f"phpdbg -qrr \"{file_path}\""
        
        # Check for launch.json fallback
        if not cmd:
            workspace_dir = os.path.dirname(file_path)
            # Find workspace root by looking for .aeres or .vscode or git
            while workspace_dir and workspace_dir != os.path.dirname(workspace_dir):
                aeres_launch = os.path.join(workspace_dir, ".aeres", "launch.json")
                vscode_launch = os.path.join(workspace_dir, ".vscode", "launch.json")
                if os.path.exists(aeres_launch):
                    try:
                        with open(aeres_launch, 'r') as f:
                            configs = json.load(f).get("configurations", [])
                            if configs: cmd = configs[0].get("command")
                    except: pass
                    break
                if os.path.exists(vscode_launch):
                    try:
                        with open(vscode_launch, 'r') as f:
                            configs = json.load(f).get("configurations", [])
                            if configs: cmd = configs[0].get("command")
                    except: pass
                    break
                workspace_dir = os.path.dirname(workspace_dir)

        if not cmd:
            await self.ws.send_text(json.dumps({"type": "event", "event": "output", "body": {"output": "Unsupported language for DAP. Create .aeres/launch.json to configure custom debug adapter.\n", "category": "stderr"}}))
            return

        try:
            self.proc = subprocess.Popen(
                cmd,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                stdin=subprocess.PIPE,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
            )
        except Exception as e:
            await self.ws.send_text(json.dumps({"type": "event", "event": "output", "body": {"output": f"Failed to launch debugger process: {e}\n", "category": "stderr"}}))
            return

        threading.Thread(target=self._read_stdout_sync, daemon=True).start()
        threading.Thread(target=self._read_stderr_sync, daemon=True).start()

        # Give the debugger server a moment to bind the port
        await asyncio.sleep(1.5)
        try:
            self.reader, self.writer = await asyncio.open_connection("127.0.0.1", 5678)
            asyncio.create_task(self.read_loop())
            await self.ws.send_text(json.dumps({"type": "event", "event": "dap_connected"}))
        except Exception as e:
            await self.ws.send_text(json.dumps({"type": "event", "event": "output", "body": {"output": f"Failed to connect to debugger: {e}\n", "category": "stderr"}}))

    def _read_stdout_sync(self):
        if not self.proc or not self.proc.stdout or not self.loop: return
        for line in iter(self.proc.stdout.readline, b''):
            msg = json.dumps({"type": "event", "event": "output", "body": {"output": line.decode('utf-8', errors='replace'), "category": "stdout"}})
            asyncio.run_coroutine_threadsafe(self.ws.send_text(msg), self.loop)

    def _read_stderr_sync(self):
        if not self.proc or not self.proc.stderr or not self.loop: return
        for line in iter(self.proc.stderr.readline, b''):
            msg = json.dumps({"type": "event", "event": "output", "body": {"output": line.decode('utf-8', errors='replace'), "category": "stderr"}})
            asyncio.run_coroutine_threadsafe(self.ws.send_text(msg), self.loop)

    async def read_loop(self):
        while True:
            try:
                header = await self.reader.readuntil(b'\r\n\r\n')
                content_length = int(header.decode('utf-8', errors='replace').split('Content-Length: ')[1].split('\r\n')[0])
                body = await self.reader.readexactly(content_length)
                msg = json.loads(body.decode('utf-8', errors='replace'))
                await self.ws.send_text(json.dumps(msg))
            except Exception:
                await self.ws.send_text(json.dumps({"type": "event", "event": "terminated"}))
                break

    async def send_to_dap(self, msg_str: str):
        if not self.writer: return
        body = msg_str.encode('utf-8')
        header = f"Content-Length: {len(body)}\r\n\r\n".encode('utf-8')
        self.writer.write(header + body)
        await self.writer.drain()

    async def close(self):
        if self.writer:
            self.writer.close()
        if self.proc:
            try:
                self.proc.terminate()
            except:
                pass


@router.websocket("/ws")
async def dap_websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    proxy = DAPProxy(websocket)
    
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            
            if msg.get("command") == "launch" and "file_path" in msg:
                await proxy.launch(msg["file_path"])
                # We do not forward the custom launch command to DAP yet.
                # Wait for initialize instead.
            else:
                await proxy.send_to_dap(data)
                
    except WebSocketDisconnect:
        await proxy.close()
    except Exception as e:
        print(f"DAP WS Error: {e}")
        await proxy.close()
