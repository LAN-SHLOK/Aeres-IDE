"""Orchestrator — runs the full modernization pipeline."""

from __future__ import annotations

import json
from typing import AsyncGenerator

from app.agents.anomaly_detector import detect_language, traverse_and_flag
from app.rag_engine.groq_gateway import (
    assemble_strict_prompt,
    stream_modernized_code,
)
from app.rag_engine.vector_db import query_relevant_fix, store_migration_context
from app.scrapers.doc_crawler import crawl_and_extract, filter_migration_syntax, resolve_doc_url
from app.scrapers.text_processor import chunk_for_vectorization


async def run_modernize_pipeline(
    file_content: str, file_path: str
) -> AsyncGenerator[str, None]:
    """Run the full modernization pipeline.

    Yields JSON-encoded strings for each event:
      - {"type": "no_deprecations"}
      - {"type": "flag_found", "flag": {...}, "source_url": "..."}
      - {"type": "code_chunk", "content": "..."}
      - {"type": "done"}
    """
    language = detect_language(file_path)
    flags = traverse_and_flag(file_content, language)

    if not flags:
        yield json.dumps({
            "type": "flag_found",
            "flag": {
                "line_number": 1,
                "function_name": "General Code Structure",
                "replacement": "Modern Syntax & Performance Optimizations",
                "docs_query": f"modern {language} coding standards",
                "code_snippet": file_content[:200] + ("..." if len(file_content) > 200 else ""),
                "severity": "info",
                "since_version": "Modern Standards"
            },
            "source_url": "https://aeres-ide.dev/docs/modernization"
        })
        
        prompt = f"""You are a master software architect and code modernization engine.
Analyze the following {language} file and modernize it completely.
Apply modern coding standards (such as ES6+, async/await, modern Python typing/syntax, cleaner structures, PEP 8, etc.).
Keep the exact same functionality, but improve syntax, reliability, and style.
Return ONLY the complete modernized code, without any markdown wrappers, explanations, or commentary.

Original Code:
```
{file_content}
```
"""
        try:
            async for chunk in stream_modernized_code(prompt):
                yield json.dumps({"type": "code_chunk", "content": chunk})
        except Exception as e:
            yield json.dumps({"type": "code_chunk", "content": file_content})
        yield json.dumps({"type": "done"})
        return

    for flag in flags:
        try:
            doc_url = await resolve_doc_url(flag.docs_query)
            scraped = await crawl_and_extract(doc_url)
            filtered = filter_migration_syntax(scraped) if scraped else ""
            chunks = chunk_for_vectorization(filtered) if filtered else []

            source_url = doc_url
            if chunks:
                store_migration_context(chunks, doc_url, flag.function_name)

            rag_results = query_relevant_fix(flag.function_name)
            context = "\n\n".join(r["document"] for r in rag_results if r.get("document"))
            if rag_results and rag_results[0].get("source_url"):
                source_url = rag_results[0]["source_url"]

            prompt = assemble_strict_prompt(flag.code_snippet, context, flag.function_name)

            yield json.dumps({
                "type": "flag_found",
                "flag": flag.model_dump(),
                "source_url": source_url,
            })

            async for chunk in stream_modernized_code(prompt):
                yield json.dumps({"type": "code_chunk", "content": chunk})

        except Exception as e:
            yield json.dumps({
                "type": "flag_found",
                "flag": flag.model_dump(),
                "source_url": "",
            })
            yield json.dumps({
                "type": "code_chunk",
                "content": flag.code_snippet,
            })

    yield json.dumps({"type": "done"})
