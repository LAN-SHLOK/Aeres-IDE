import os
import asyncio
from app.api.endpoints.deps import scan_deps
from app.core.models import DepScanRequest

async def test():
    root = "c:\\Project\\Aeres_IDE\\AERES-IDE"
    print(f"Scanning root: {root}")
    req = DepScanRequest(root_path=root)
    results = await scan_deps(req, None, {})
    print(f"NPM count: {len(results['npm'])}")
    print(f"PYPI count: {len(results['pypi'])}")
    if results['pypi']:
        print(f"Sample PYPI: {results['pypi'][0]['name']}")

if __name__ == "__main__":
    asyncio.run(test())
