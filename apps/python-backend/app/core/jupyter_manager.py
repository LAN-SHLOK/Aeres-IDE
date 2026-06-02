import asyncio
import uuid
import queue
from typing import Dict, Any, Optional, AsyncGenerator

try:
    from jupyter_client import AsyncKernelManager
except ImportError:
    AsyncKernelManager = None

class JupyterManager:
    def __init__(self):
        self.kernel_managers: Dict[str, AsyncKernelManager] = {}
        self.kernel_clients: Dict[str, Any] = {}

    async def start_kernel(self, session_id: str) -> bool:
        if not AsyncKernelManager:
            raise RuntimeError("jupyter_client is not installed. Please install it to use Jupyter features.")
        if session_id in self.kernel_managers:
            return True
            
        km = AsyncKernelManager(kernel_name='python3')
        await km.start_kernel()
        kc = km.client()
        kc.start_channels()
        try:
            await kc.wait_for_ready(timeout=10)
        except Exception as e:
            print(f"[Jupyter] Kernel failed to start: {e}")
            await km.shutdown_kernel()
            return False
            
        self.kernel_managers[session_id] = km
        self.kernel_clients[session_id] = kc
        return True

    async def stop_kernel(self, session_id: str):
        if session_id in self.kernel_clients:
            self.kernel_clients[session_id].stop_channels()
            del self.kernel_clients[session_id]
        if session_id in self.kernel_managers:
            await self.kernel_managers[session_id].shutdown_kernel(now=True)
            del self.kernel_managers[session_id]

    async def execute_code(self, session_id: str, code: str) -> AsyncGenerator[Dict[str, Any], None]:
        if session_id not in self.kernel_clients:
            await self.start_kernel(session_id)
            
        kc = self.kernel_clients.get(session_id)
        if not kc:
            yield {"type": "error", "content": "Kernel not running."}
            return

        msg_id = kc.execute(code)
        
        while True:
            try:
                # get_iopub_msg is usually sync, we can use asyncio.to_thread
                msg = await asyncio.to_thread(kc.get_iopub_msg, timeout=0.1)
                
                if msg['parent_header'].get('msg_id') != msg_id:
                    continue
                    
                msg_type = msg['header']['msg_type']
                content = msg['content']
                
                if msg_type == 'stream':
                    yield {"type": "stream", "name": content.get("name"), "text": content.get("text")}
                elif msg_type == 'execute_result':
                    yield {"type": "execute_result", "data": content.get("data")}
                elif msg_type == 'display_data':
                    yield {"type": "display_data", "data": content.get("data")}
                elif msg_type == 'error':
                    yield {"type": "error", "ename": content.get("ename"), "evalue": content.get("evalue"), "traceback": content.get("traceback")}
                elif msg_type == 'status' and content.get('execution_state') == 'idle':
                    break
            except queue.Empty:
                await asyncio.sleep(0.05)
            except Exception as e:
                print(f"[Jupyter] Error reading message: {e}")
                break

jupyter_manager = JupyterManager()
