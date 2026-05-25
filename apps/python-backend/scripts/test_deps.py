import os
import asyncio
from app.agents.dep_scanner import scan_python_deps

async def test():
    print(f"Current dir: {os.getcwd()}")
    print(f"Req exists: {os.path.exists('requirements.txt')}")
    results = await scan_python_deps('requirements.txt')
    print(f"Results: {results}")

if __name__ == "__main__":
    asyncio.run(test())
