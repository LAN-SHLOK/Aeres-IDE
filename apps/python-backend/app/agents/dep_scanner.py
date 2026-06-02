import httpx, json, asyncio
import re, os
from typing import List, Dict
from datetime import datetime, timezone
from app.rag_engine.vector_db import get_package_migration_docs

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
    
    async with httpx.AsyncClient(timeout=15) as client:
        tasks = [scan_single_npm(client, name, ver) for name, ver in all_deps.items()]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    return [r for r in results if isinstance(r, dict)]

async def scan_single_npm(client: httpx.AsyncClient, name: str, version_spec: str) -> Dict:
    clean_ver = version_spec.lstrip('^~>=')
    try:
        reg = await client.get(f"{NPM_REGISTRY}/{name}")
        data = reg.json()
        latest = data.get('dist-tags', {}).get('latest', '')
        current_info = data.get('versions', {}).get(clean_ver, {})
        if not current_info and latest:
            current_info = data.get('versions', {}).get(latest, {})
            
        license_str = current_info.get('license', 'unknown')
        deprecated = bool(current_info.get('deprecated'))
        deprecation_msg = current_info.get('deprecated', '') if deprecated else ''

        # Get bundle size (disabled to speed up scan)
        bundle_kb = None

        # Check for CVEs
        cves = await check_osv(client, name, clean_ver, 'npm')

        # Check last publish date
        time_data = data.get('time', {})
        last_publish = time_data.get(latest, '')
        is_abandoned = False
        days_since_publish = 0
        if last_publish:
            pub_date = datetime.fromisoformat(last_publish.replace('Z', '+00:00'))
            days_since_publish = (datetime.now(timezone.utc) - pub_date).days
            is_abandoned = days_since_publish > 730

        # Auto-fetch changelog/release notes URL
        repo_url = ''
        changelog_url = ''
        homepage = data.get('homepage', '')
        repo = data.get('repository', {})
        if isinstance(repo, dict):
            repo_url = repo.get('url', '').replace('git+', '').replace('git://', 'https://').replace('.git', '')
        elif isinstance(repo, str):
            repo_url = repo

        # Build changelog URL from repo
        if 'github.com' in repo_url:
            base_repo = repo_url.split('github.com/')[-1].split('#')[0]
            changelog_url = f"https://github.com/{base_repo}/releases"

        # Fetch latest release notes / migration guide from GitHub
        migration_notes = ''
        breaking_changes = []

        status = 'healthy'
        if cves: status = 'critical'
        elif deprecated or is_abandoned: status = 'abandoned'
        elif clean_ver != latest: status = 'outdated'

        return {
            'name': name, 'current': clean_ver, 'latest': latest,
            'status': status, 'cves': cves, 'license': license_str,
            'bundleKb': bundle_kb, 'deprecated': deprecated,
            'deprecationMsg': deprecation_msg,
            'isAbandoned': is_abandoned, 'ecosystem': 'npm',
            'daysSincePublish': days_since_publish,
            'repoUrl': repo_url,
            'changelogUrl': changelog_url,
            'homepage': homepage,
            'migrationNotes': migration_notes,
            'breakingChanges': breaking_changes,
        }
    except Exception as e:
        return {'name': name, 'current': clean_ver, 'status': 'unknown', 'error': str(e), 'ecosystem': 'npm'}


async def fetch_npm_migration_info(client, repo_url: str, current: str, latest: str, name: str):
    """Auto-fetch release notes and detect breaking changes from GitHub releases."""
    migration_notes = ''
    breaking_changes = []
    
    # 1. Check Offline ChromaDB first
    try:
        offline_docs = get_package_migration_docs(name)
        if offline_docs:
            combined_docs = "\\n\\n".join([doc["document"] for doc in offline_docs])
            migration_notes = combined_docs[:500] + "...\\n\\n[Offline Docs Loaded from ChromaDB]"
            # Extract basic breaking changes from docs
            lines = combined_docs.split('\\n')
            for line in lines:
                if 'breaking' in line.lower() or 'removed' in line.lower() or 'deprecated' in line.lower():
                    clean = line.strip().lstrip('*-# ')
                    if clean and len(clean) > 5 and clean not in breaking_changes:
                        breaking_changes.append(clean[:200])
            return migration_notes, breaking_changes[:5]
    except Exception:
        pass

    try:
        # Extract owner/repo from URL
        parts = repo_url.split('github.com/')[-1].split('#')[0].strip('/')
        if '/' not in parts:
            return migration_notes, breaking_changes
            
        # Fetch latest release from GitHub API
        api_url = f"https://api.github.com/repos/{parts}/releases/latest"
        resp = await client.get(api_url, headers={'Accept': 'application/vnd.github.v3+json'})
        if resp.status_code == 200:
            release = resp.json()
            body = release.get('body', '') or ''
            tag = release.get('tag_name', '')
            
            # Extract migration notes (first 500 chars)
            migration_notes = body[:500] if body else f'Updated to {tag}'
            
            # Detect breaking changes
            lower_body = body.lower()
            if 'breaking' in lower_body or 'BREAKING' in body:
                lines = body.split('\n')
                for line in lines:
                    if 'breaking' in line.lower() or 'removed' in line.lower() or 'deprecated' in line.lower():
                        clean = line.strip().lstrip('*-# ')
                        if clean and len(clean) > 5:
                            breaking_changes.append(clean[:200])
                
            # If no explicit breaking changes found but major version changed
            if not breaking_changes:
                try:
                    cur_major = int(current.split('.')[0])
                    lat_major = int(latest.split('.')[0])
                    if lat_major > cur_major:
                        breaking_changes.append(f'Major version bump: {current} → {latest}. Review migration guide.')
                except Exception as e:
                    import sys
                    print(f"[Dep Scanner] Error extracting python import: {e}", file=sys.stderr)
    except Exception:
        pass
    
    return migration_notes, breaking_changes[:5]


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
    except Exception as e:
        import sys
        print(f"[Dep Scanner] Error extracting javascript imports: {e}", file=sys.stderr)
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
            # Improved regex to handle extras [standard] and various operators
            match = re.match(r'^([a-zA-Z0-9_\-\.\[\]]+)\s*(?:[>=<~]{1,2})\s*([0-9\.\*a-z\-]+)', line)
            if match:
                packages.append({'name': match.group(1), 'version': match.group(2)})

    async with httpx.AsyncClient(timeout=15) as client:
        tasks = [scan_single_pypi(client, p['name'], p['version']) for p in packages]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    return [r for r in results if isinstance(r, dict)]

async def scan_single_pypi(client, name, version):
    # Strip extras like [standard] for PyPI API lookup
    clean_name = re.sub(r'\[.*?\]', '', name)
    try:
        resp = await client.get(f"{PYPI_API}/{clean_name}/json")
        data = resp.json()
        info = data.get('info', {})
        latest = info.get('version', version)
        cves = await check_osv(client, clean_name, version, 'pypi')
        license_str = info.get('license', 'unknown')
        
        # Auto-fetch project URLs for docs/changelog
        project_urls = info.get('project_urls', {}) or {}
        homepage = info.get('home_page', '') or info.get('package_url', '')
        changelog_url = project_urls.get('Changelog', '') or project_urls.get('Changes', '') or project_urls.get('Release Notes', '') or ''
        docs_url = project_urls.get('Documentation', '') or project_urls.get('Docs', '') or ''
        repo_url = project_urls.get('Source', '') or project_urls.get('Repository', '') or project_urls.get('GitHub', '') or project_urls.get('Code', '') or ''
        
        # Get description for context
        summary = info.get('summary', '')
        
        # Check for deprecation in classifiers
        classifiers = info.get('classifiers', [])
        deprecated = any('Inactive' in c or 'deprecated' in c.lower() for c in classifiers)
        deprecation_msg = 'Package marked as inactive/deprecated in PyPI classifiers.' if deprecated else ''
        
        # Check last publish date
        releases = data.get('releases', {})
        days_since_publish = 0
        is_abandoned = False
        if latest in releases and releases[latest]:
            upload_time = releases[latest][-1].get('upload_time', '')
            if upload_time:
                try:
                    pub_date = datetime.fromisoformat(upload_time)
                    days_since_publish = (datetime.now(timezone.utc) - pub_date.replace(tzinfo=timezone.utc)).days
                    is_abandoned = days_since_publish > 730
                except Exception as e:
                    import sys
                    print(f"[Dep Scanner] Error extracting go import: {e}", file=sys.stderr)

        # Auto-fetch migration notes from GitHub if available
        migration_notes = ''
        breaking_changes = []

        status = 'healthy'
        if cves: status = 'critical'
        elif deprecated or is_abandoned: status = 'abandoned'
        elif version != latest: status = 'outdated'
        
        return {
            'name': clean_name, 'current': version, 'latest': latest, 'status': status,
            'cves': cves, 'license': license_str, 'ecosystem': 'pypi',
            'deprecated': deprecated, 'deprecationMsg': deprecation_msg,
            'isAbandoned': is_abandoned, 'daysSincePublish': days_since_publish,
            'summary': summary,
            'repoUrl': repo_url, 'changelogUrl': changelog_url,
            'docsUrl': docs_url, 'homepage': homepage,
            'migrationNotes': migration_notes,
            'breakingChanges': breaking_changes,
        }
    except Exception as e:
        return {'name': clean_name, 'current': version, 'status': 'unknown', 'error': str(e), 'ecosystem': 'pypi'}


async def fetch_pypi_migration_info(client, repo_url: str, current: str, latest: str, name: str):
    """Auto-fetch release notes from GitHub for Python packages."""
    migration_notes = ''
    breaking_changes = []

    # 1. Check Offline ChromaDB first
    try:
        offline_docs = get_package_migration_docs(name)
        if offline_docs:
            combined_docs = "\\n\\n".join([doc["document"] for doc in offline_docs])
            migration_notes = combined_docs[:500] + "...\\n\\n[Offline Docs Loaded from ChromaDB]"
            # Extract basic breaking changes from docs
            lines = combined_docs.split('\\n')
            for line in lines:
                if 'breaking' in line.lower() or 'removed' in line.lower() or 'deprecated' in line.lower():
                    clean = line.strip().lstrip('*-# ')
                    if clean and len(clean) > 5 and clean not in breaking_changes:
                        breaking_changes.append(clean[:200])
            return migration_notes, breaking_changes[:5]
    except Exception:
        pass

    try:
        parts = repo_url.split('github.com/')[-1].split('#')[0].strip('/')
        if '/' not in parts:
            return migration_notes, breaking_changes
            
        api_url = f"https://api.github.com/repos/{parts}/releases/latest"
        resp = await client.get(api_url, headers={'Accept': 'application/vnd.github.v3+json'})
        if resp.status_code == 200:
            release = resp.json()
            body = release.get('body', '') or ''
            tag = release.get('tag_name', '')
            
            migration_notes = body[:500] if body else f'Updated to {tag}'
            
            lower_body = body.lower()
            if 'breaking' in lower_body or 'removed' in lower_body.split('\n')[0] if lower_body else False:
                lines = body.split('\n')
                for line in lines:
                    if 'breaking' in line.lower() or 'removed' in line.lower() or 'deprecated' in line.lower():
                        clean = line.strip().lstrip('*-# ')
                        if clean and len(clean) > 5:
                            breaking_changes.append(clean[:200])
            
            if not breaking_changes:
                try:
                    cur_major = int(current.split('.')[0])
                    lat_major = int(latest.split('.')[0])
                    if lat_major > cur_major:
                        breaking_changes.append(f'Major version bump: {current} → {latest}. Review migration guide.')
                except Exception as e:
                    import sys
                    print(f"[Dep Scanner] Error extracting java import: {e}", file=sys.stderr)
    except Exception:
        pass
    
    return migration_notes, breaking_changes[:5]
