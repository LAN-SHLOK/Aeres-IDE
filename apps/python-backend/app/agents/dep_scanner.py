import httpx, json, asyncio
from typing import List, Dict
import re, os
from datetime import datetime, timezone

OSV_API = "https://api.osv.dev/v1/query"
BUNDLEPHOBIA_API = "https://bundlephobia.com/api/size"
NPM_REGISTRY = "https://registry.npmjs.org"
PYPI_API = "https://pypi.org/pypi"

async def scan_npm_deps(package_json_path: str) -> List[Dict]:
    if not os.path.exists(package_json_path): return []
    try:
        with open(package_json_path) as f:
            pkg = json.load(f)
    except Exception: return []

    all_deps = {**pkg.get('dependencies', {}), **pkg.get('devDependencies', {})}
    
    async with httpx.AsyncClient(timeout=10) as client:
        tasks = [scan_single_npm(client, name, ver) for name, ver in all_deps.items()]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    return [r for r in results if isinstance(r, dict)]

async def scan_single_npm(client: httpx.AsyncClient, name: str, version_spec: str) -> Dict:
    clean_ver = version_spec.lstrip('^~>=')
    try:
        # Get registry info
        reg = await client.get(f"{NPM_REGISTRY}/{name}")
        data = reg.json()
        latest = data.get('dist-tags', {}).get('latest', '')
        current_info = data.get('versions', {}).get(clean_ver, {})
        if not current_info and latest:
            current_info = data.get('versions', {}).get(latest, {})
            
        license_str = current_info.get('license', 'unknown')
        deprecated = bool(current_info.get('deprecated'))

        # Get bundle size from bundlephobia (optional/best effort)
        bundle_kb = None
        try:
            bp = await client.get(f"{BUNDLEPHOBIA_API}?package={name}@{clean_ver}")
            if bp.status_code == 200:
                bundle_kb = round(bp.json().get('gzip', 0) / 1024, 1)
        except Exception: pass

        # Check OSV for CVEs
        cves = await check_osv(client, name, clean_ver, 'npm')

        # Check last publish date
        time_data = data.get('time', {})
        last_publish = time_data.get(latest, '')
        is_abandoned = False
        if last_publish:
            pub_date = datetime.fromisoformat(last_publish.replace('Z', '+00:00'))
            days_old = (datetime.now(timezone.utc) - pub_date).days
            is_abandoned = days_old > 730  # 2 years no publish

        status = 'healthy'
        if cves: status = 'critical'
        elif deprecated or is_abandoned: status = 'abandoned'
        elif clean_ver != latest: status = 'outdated'

        return {
            'name': name, 'current': clean_ver, 'latest': latest,
            'status': status, 'cves': cves, 'license': license_str,
            'bundleKb': bundle_kb, 'deprecated': deprecated,
            'isAbandoned': is_abandoned, 'ecosystem': 'npm',
        }
    except Exception as e:
        return {'name': name, 'current': clean_ver, 'status': 'unknown', 'error': str(e), 'ecosystem': 'npm'}

async def check_osv(client, package_name: str, version: str, ecosystem: str) -> List[Dict]:
    eco_map = {'npm': 'npm', 'pypi': 'PyPI'}
    try:
        resp = await client.post(OSV_API, json={
            "version": version,
            "package": {"name": package_name, "ecosystem": eco_map.get(ecosystem, ecosystem)}
        })
        if resp.status_code == 200:
            vulns = resp.json().get('vulns', [])
            return [{'id': v['id'], 'summary': v.get('summary', '')[:100]} for v in vulns[:3]]
    except Exception: pass
    return []

async def scan_python_deps(requirements_path: str) -> List[Dict]:
    if not os.path.exists(requirements_path): return []
    try:
        with open(requirements_path) as f:
            lines = f.readlines()
    except Exception: return []

    packages = []
    for line in lines:
        line = line.strip()
        if line and not line.startswith('#'):
            match = re.match(r'^([a-zA-Z0-9_\-\.]+)==?([0-9\.]+)?', line)
            if match:
                packages.append({'name': match.group(1), 'version': match.group(2) or 'unknown'})

    async with httpx.AsyncClient(timeout=10) as client:
        tasks = [scan_single_pypi(client, p['name'], p['version']) for p in packages]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    return [r for r in results if isinstance(r, dict)]

async def scan_single_pypi(client, name, version):
    try:
        resp = await client.get(f"{PYPI_API}/{name}/json")
        data = resp.json()
        info = data.get('info', {})
        latest = info.get('version', version)
        cves = await check_osv(client, name, version, 'pypi')
        license_str = info.get('license', 'unknown')
        
        status = 'healthy'
        if cves: status = 'critical'
        elif version != latest: status = 'outdated'
        
        return {
            'name': name, 'current': version, 'latest': latest, 'status': status,
            'cves': cves, 'license': license_str, 'ecosystem': 'pypi'
        }
    except Exception as e:
        return {'name': name, 'current': version, 'status': 'unknown', 'error': str(e), 'ecosystem': 'pypi'}
