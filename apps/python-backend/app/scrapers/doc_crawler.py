"""Doc crawler — resolves documentation URLs and extracts migration-relevant text."""

from __future__ import annotations

import asyncio
import re
import time
from typing import Dict, Optional
from urllib.parse import urlparse, urljoin
from urllib.robotparser import RobotFileParser

import httpx
from bs4 import BeautifulSoup

KNOWN_SOURCES: Dict[str, str] = {
    "react": "https://react.dev",
    "next": "https://nextjs.org/docs",
    "vue": "https://vuejs.org/guide",
    "angular": "https://angular.io/docs",
    "python": "https://docs.python.org/3",
    "django": "https://docs.djangoproject.com",
    "flask": "https://flask.palletsprojects.com",
    "node": "https://nodejs.org/api",
    "moment": "https://momentjs.com/docs",
    "axios": "https://axios-http.com/docs",
}

_robots_cache: Dict[str, bool] = {}
_last_request: Dict[str, float] = {}
_RATE_LIMIT = 2.0  # seconds between requests per domain


async def resolve_doc_url(docs_query: str) -> str:
    """Resolve a documentation query to a URL using known sources and DuckDuckGo."""
    query_lower = docs_query.lower()
    for keyword, base_url in KNOWN_SOURCES.items():
        if keyword in query_lower:
            return base_url

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://api.duckduckgo.com/",
                params={"q": docs_query, "format": "json", "no_redirect": "1"},
            )
            data = resp.json()
            abstract_url = data.get("AbstractURL", "")
            if abstract_url:
                return abstract_url
            related = data.get("RelatedTopics", [])
            for topic in related:
                if isinstance(topic, dict) and topic.get("FirstURL"):
                    return topic["FirstURL"]
    except Exception as e:
        print(f"[doc_crawler] DuckDuckGo resolve failed: {e}")

    return f"https://www.google.com/search?q={docs_query.replace(' ', '+')}"


def can_fetch(url: str) -> bool:
    """Check robots.txt to see if we can fetch a URL."""
    parsed = urlparse(url)
    base = f"{parsed.scheme}://{parsed.netloc}"
    if base in _robots_cache:
        return _robots_cache[base]
    try:
        rp = RobotFileParser()
        rp.set_url(f"{base}/robots.txt")
        rp.read()
        allowed = rp.can_fetch("AgenticIDE/1.0", url)
        _robots_cache[base] = allowed
        return allowed
    except Exception:
        _robots_cache[base] = True
        return True


async def polite_fetch(url: str) -> str:
    """Fetch a URL with rate limiting and a polite User-Agent."""
    domain = urlparse(url).netloc
    now = time.time()
    last = _last_request.get(domain, 0)
    wait = _RATE_LIMIT - (now - last)
    if wait > 0:
        await asyncio.sleep(wait)
    _last_request[domain] = time.time()

    async with httpx.AsyncClient(
        timeout=30.0,  # Increased for large pages
        headers={"User-Agent": "AgenticIDE/1.0"},
        follow_redirects=True,
    ) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.text


async def find_latest_release_url(index_url: str, link_pattern: str) -> Optional[str]:
    """Fetch an index URL, parse it, and return the first link matching the regex pattern."""
    try:
        html = await polite_fetch(index_url)
        soup = BeautifulSoup(html, "html.parser")
        pattern = re.compile(link_pattern, re.IGNORECASE)
        for a in soup.find_all("a", href=True):
            if pattern.search(a["href"]):
                return urljoin(index_url, a["href"])
    except Exception as e:
        print(f"[doc_crawler] Failed to traverse {index_url}: {e}")
    return None


async def crawl_and_extract(url: str) -> str:
    """Crawl a URL and extract clean text content."""
    if not can_fetch(url):
        # Even if robots.txt says no, for local/internal debugging URLs we might allow
        if "localhost" not in url and "127.0.0.1" not in url:
            return ""

    try:
        try:
            from playwright.async_api import async_playwright
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page(user_agent="AgenticIDE/1.0")
                await page.goto(url, timeout=30000, wait_until="networkidle")
                html = await page.content()
                await browser.close()
        except ImportError:
            html = await polite_fetch(url)
        except Exception as e:
            print(f"[doc_crawler] Playwright fetch failed for {url}, falling back: {e}")
            html = await polite_fetch(url)
    except Exception as e:
        print(f"[doc_crawler] Fetch failed for {url}: {e}")
        return ""

    soup = BeautifulSoup(html, "html.parser")

    for tag in soup.find_all(["nav", "header", "footer", "script", "style", "aside"]):
        tag.decompose()
    for el in soup.find_all(class_=re.compile(r"(menu|nav)", re.I)):
        el.decompose()

    # Preserve code blocks
    for code in soup.find_all("code"):
        text = code.get_text()
        code.replace_with(f"\n```\n{text}\n```\n")

    content_el = (
        soup.find("article")
        or soup.find("main")
        or soup.find(class_="content")
        or soup.find("body")
    )
    if not content_el:
        return ""

    text = content_el.get_text(separator="\n", strip=True)

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return "\n".join(lines)


def filter_migration_syntax(raw_text: str) -> str:
    """Filter text to keep only migration-relevant paragraphs."""
    keywords = [
        "deprecated",
        "replaced by",
        "instead use",
        "migration",
        "use .* instead",
        "no longer",
        "removed in",
    ]
    pattern = re.compile("|".join(keywords), re.IGNORECASE)

    paragraphs = raw_text.split("\n")
    result: list[str] = []
    i = 0
    while i < len(paragraphs):
        if pattern.search(paragraphs[i]):
            end = min(i + 3, len(paragraphs))
            result.extend(paragraphs[i:end])
            i = end
        else:
            i += 1

    return "\n".join(result) if result else raw_text[:2000]
